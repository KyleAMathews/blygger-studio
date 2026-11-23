/**
 * This oracle owns the owner-only private item: an item published with
 * `visibility: "private"` stays off the public surface, its first public version
 * is v1, and nothing that names it can be published. It owns the shared
 * `servedPublicly` predicate, private publication and the reference resolver.
 *
 * ```ts
 * POST /blyg/api/items/A/publish { visibility: "private" } // → 200; status "private", public version 0
 * GET /blyg/items/A.json, /blyg/f/A/, feed, index, archive, home, hopper // → 404 and unlisted while A is private
 * POST /blyg/api/items/A/publish {} // → v1 when A was private; changelog without private notes
 * POST /blyg/api/items/B/publish {} // → 400 while B's working copy names private A
 * POST /blyg/api/items/A/publish {} // → private when defaultVisibility is "private" and A was never public
 * GET /blyg/api/reading?sub=own // → A, marked private, showing its latest private version
 * GET /blyg/api/items/A/private-versions // → p2, p1 with their notes and texts, newest first
 * DELETE /blyg/api/items/A {} // → 200 while A was never public; A and its private versions are gone
 * ```
 *
 * Why does a privately published item, which has versions, a clean working copy
 * and a status other than draft, still 404? Every public route used to refuse
 * an own item by asking whether it was a draft. A private item is not one, so a
 * route that kept the old question would serve it. The question is now the
 * allow-list, *served publicly*: status public or withdrawn.
 *
 * Three parts move. The private history is the item's private versions, kept
 * apart from the public counter, which stays 0 until the item first goes public.
 * Raising is an ordinary publish of a private item; it starts the public
 * counter at 1. The block is the reference resolver: `[[A]]` and `![[A]]`
 * resolve only to an item served publicly, so naming a private item fails the
 * publish that would put a link to it on the wire.
 *
 * For every history of edits, private publications, public publications,
 * pins and withdrawals, each public route serves or lists the item only while
 * it is public or withdrawn (decision by Venkat Rao (GitHub vgururao),
 * 2026-11-22). A draft and a private item give 404 on the item document, every
 * version document and the page, and appear in no listing. A withdrawn item
 * keeps its document, pins and page (protocol §9); whether a listing still
 * carries it is that listing's choice. A leak shows as a 200, or as the id in
 * a listing.
 *
 * For every item published privately any number of times and then published,
 * the first public version is v1 and the public changelog holds only public
 * publications (decision #94; Venkat Rao, 2026-11-22). No private note and no
 * text that was only ever kept privately appears on any public route. A leak
 * shows as a v2 or later for the first public version, or a private note in
 * the changelog or the feed.
 *
 * For every working copy that names a private item, a published item's pending
 * changes included, public publication is refused and the public version does
 * not move (private-items proposal §3.4 and §8 answer 2; Venkat Rao,
 * 2026-11-22). A draft or withdrawn item is refused the same way (Venkat Rao,
 * 2026-11-23). Once the named item is public, the same publication succeeds.
 *
 * For every publish that names no visibility, an item that has never been
 * public is published as the blyg's default visibility says; an item already
 * public publishes publicly, and a named visibility is honoured exactly
 * (decision by Venkat Rao (GitHub vgururao), 2026-11-22). In a private-default
 * blyg a tool takes an item public only by saying `visibility: "public"`.
 *
 * For every history, the owner's reader lists an own item while it is public,
 * withdrawn or private, never as a draft; a private one is marked private and
 * shows its latest private version (Venkat Rao, 2026-11-22). The reader is the
 * owner's own, so this is not a public route and the first law still holds.
 *
 * For every history, the owner's private-versions list holds exactly the
 * item's private publications, p1 to pn, newest first, each with its note and
 * the text it kept; raising to public keeps them, as studio history; discarding
 * an item that was never public removes it and its private versions, and a
 * public item cannot be discarded (Venkat Rao, 2026-11-23). The list is the
 * owner's, like the reader.
 *
 * The model reads only the plan. It counts public and private publications and
 * tracks status, pins and which texts were only kept privately. Every history
 * uses distinct markers: private notes and privately kept text contain
 * "kept-", which no public publication in these histories carries, so any
 * occurrence on a public route is a leak. The driver goes through the mounted
 * Worker over SELF with an owner cookie, and reads each public route
 * anonymously after every action.
 *
 * Limits: one item per history, plus one referring thread for the block. A
 * private publish that races another write is the private-conflict oracle's. Search,
 * the picker, tokens, mentions sent and the MCP surface are later work (plan §1
 * 0d, 0e). Media is the media-visibility oracle's. The listing check for a
 * withdrawn item accepts either answer, so this oracle does not judge whether
 * a listing drops a withdrawn item.
 */
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { apiJson, getPublic, login } from './helpers.ts';
import { withOracleStorage } from './oracle-storage.ts';

type Op =
  | { op: 'edit'; text: string }
  | { op: 'keep'; note: string }
  | { op: 'publish'; note: string; visibility?: 'public' | 'private' }
  | { op: 'default'; value: 'public' | 'private' }
  | { op: 'pin' | 'withdraw' | 'discard' }
  | { op: 'refer'; form: 'link' | 'quote'; pending: boolean };
type History = { name: string; kind: 'fragment' | 'thread'; actions: Op[] };
const LISTINGS = ['feed', 'index', 'archive', 'home', 'hopper'] as const;
type Listing = (typeof LISTINGS)[number];

// The model's state: status as the owner sees it, the public counter, the pins
// and the private counter. `private` counts private publications; it never
// reaches a public observation, which is what the second law needs to say.
// `def` is the blyg's default visibility; `text` the working copy, `kept` and
// `shown` the texts of the latest private and public versions, for the reader.
// `log` is the private history, oldest first. `gone` is a discarded item.
type State = { status: 'draft' | 'private' | 'public' | 'withdrawn' | 'gone'; public: number; private: number; pinned: Set<number>; changelog: { version: number; note: string | null }[]; def: 'public' | 'private'; text: string; kept: string; shown: string; log: { version: number; note: string | null; text: string }[] };
const initial = (): State => ({ status: 'draft', public: 0, private: 0, pinned: new Set(), changelog: [], def: 'public', text: 'draft words', kept: '', shown: '', log: [] });
const served = (state: State) => state.status === 'public' || state.status === 'withdrawn';

// A public item is never lowered: a private publish of one is refused and changes nothing.
function keep(state: State, note: string) {
  if (state.public) return 409;
  state.status = 'private'; state.private++; state.kept = state.text; state.log.push({ version: state.private, note: note || null, text: state.text }); return 200;
}
function step(state: State, action: Op): unknown {
  switch (action.op) {
    case 'edit': state.text = action.text; return 200;
    case 'default': state.def = action.value; return 200;
    case 'keep': return keep(state, action.note);
    case 'publish': {
      // An omitted visibility follows the default only while the item was never public.
      const visibility = action.visibility ?? (state.public ? 'public' : state.def);
      if (visibility === 'private') return keep(state, action.note);
      state.status = 'public'; state.public++; state.shown = state.text; state.changelog.push({ version: state.public, note: action.note }); return 200;
    }
    case 'pin': state.pinned.add(state.public); return 200;
    case 'withdraw': state.status = 'withdrawn'; state.public++; state.changelog.push({ version: state.public, note: null }); return 200;
    // Only an item that was never public can be discarded; a public one is withdrawn instead.
    case 'discard': if (state.public) return 409; state.status = 'gone'; return 200;
    case 'refer': {
      // The referring thread's public version moves only on an accepted publish.
      const accepted = state.status === 'public';
      const before = action.pending ? 1 : 0;
      return { named: state.status, publish: accepted ? 200 : 400, version: accepted ? before + 1 : before };
    }
  }
}

// Version documents are probed past every counter the item has, the private
// one included, so a private version served under its own number is seen.
const probedVersions = (history: History) => history.actions.filter(action => action.op === 'keep' || action.op === 'publish' || action.op === 'withdraw').length + 1;
const gone = (state: State) => state.status === 'gone';

function surface(state: State, history: History) {
  const visible = served(state);
  return {
    // The status the owner sees names the state the surface is judged in.
    status: gone(state) ? null : state.status,
    document: visible ? 200 : 404,
    page: visible ? 200 : 404,
    versions: Array.from({ length: probedVersions(history) }, (_, i) => state.pinned.has(i + 1) && visible ? 200 : 404),
    // A withdrawn item's listings are each listing's choice (protocol §9): null accepts either.
    listed: Object.fromEntries(LISTINGS.map(name => [name, state.status === 'withdrawn' ? null : state.status === 'public'])) as Record<Listing, boolean | null>,
  };
}
const reader = (state: State) => state.status === 'draft' || gone(state) ? null : {
  private: state.status === 'private', withdrawn: state.status === 'withdrawn',
  text: state.status === 'withdrawn' ? '' : state.status === 'private' ? state.kept : state.shown,
};
const raise = (state: State) => ({
  owner: gone(state) ? null : { status: state.status, version: state.public },
  ...(served(state) ? { version: state.public, changelog: state.changelog.map(entry => ({ ...entry })) } : {}),
  leaked: false,
});
// Newest first, as the list pages; a discarded item has no list.
const kept = (state: State) => gone(state) ? null : state.log.map(entry => ({ ...entry })).reverse();

function model(history: History): Observation[] {
  const state = initial(), expected: Observation[] = [];
  const snapshot = (at: string) => {
    expected.push({ checkpoint: `surface ${at}`, value: surface(state, history) }, { checkpoint: `raise ${at}`, value: raise(state) }, { checkpoint: `reader ${at}`, value: reader(state) }, { checkpoint: `history ${at}`, value: kept(state) });
  };
  snapshot('after create');
  history.actions.forEach((action, index) => {
    const value = step(state, action);
    expected.push({ checkpoint: action.op === 'refer' ? `block ${index}` : `action ${index}: ${action.op}`, value });
    snapshot(`after ${index}`);
  });
  return expected;
}

const MARKER = 'kept-';
// Each history starts from the same storage, so one history's publications
// cannot show up in another's listings.
const driver = (history: History, observe: (checkpoint: string, value: unknown) => void) => withOracleStorage(() => drive(history, observe));
async function drive(history: History, observe: (checkpoint: string, value: unknown) => void) {
  const cookie = await login();
  const api = (method: string, path: string, body?: unknown) => apiJson(cookie, method, '/blyg/api' + path, body);
  const created = await api('POST', '/items', { contentMd: 'draft words', kind: history.kind });
  if (created.status !== 201) throw new Error('private-items fixture could not create its item: ' + created.status);
  const id = created.json.id as string;
  const hopper = (await api('POST', '/hoppers', { name: 'Private items oracle' })).json as { id: string };
  await api('PATCH', `/hoppers/${hopper.id}`, { public: true });
  const slug = (await api('GET', `/hoppers/${hopper.id}`)).json.hopper.slug as string;
  if ((await api('PUT', `/hoppers/${hopper.id}/items/~own/${id}`)).status !== 200) throw new Error('private-items fixture could not add its item to a hopper');
  const page = `/blyg/${history.kind === 'thread' ? 't' : 'f'}/${id}/`;
  const listings: Record<Listing, string> = { feed: '/blyg/feed.xml', index: '/blyg/items/index.json', archive: '/blyg/archive', home: '/blyg/', hopper: `/blyg/h/${slug}` };
  const read = async (path: string) => { const response = await getPublic(path); return { status: response.status, body: await response.text() }; };
  let published = 0;

  async function snapshot(at: string) {
    const document = await read(`/blyg/items/${id}.json`), shown = await read(page);
    const versions = await Promise.all(Array.from({ length: probedVersions(history) }, (_, i) => read(`/blyg/items/${id}/v${i + 1}.json`)));
    const listed = Object.fromEntries(await Promise.all(LISTINGS.map(async name => [name, (await read(listings[name])).body.includes(id)] as const)));
    const bodies = [document, shown, ...versions, ...await Promise.all(LISTINGS.map(name => read(listings[name])))];
    const found = await api('GET', `/items/${id}`), owner = found.status === 200 ? found.json as { status: string; version: number } : null;
    observe(`surface ${at}`, { status: owner?.status ?? null, document: document.status, page: shown.status, versions: versions.map(v => v.status), listed });
    const wire = document.status === 200 ? JSON.parse(document.body) as { version: number; changelog: { version: number; note: string | null }[] } : undefined;
    observe(`raise ${at}`, {
      owner: owner && { status: owner.status, version: owner.version },
      ...(wire ? { version: wire.version, changelog: wire.changelog.map(entry => ({ version: entry.version, note: entry.note })) } : {}),
      leaked: bodies.some(entry => entry.status === 200 && entry.body.includes(MARKER)),
    });
    // The owner's reader, both lenses, since a Background rule may hold any version.
    type Entry = { key: string; withdrawn: boolean; contentHtml: string; own?: { private?: boolean } };
    const lens = async (query: string) => ((await api('GET', `/reading?sub=own&limit=50${query}`)).json?.items ?? []) as Entry[];
    const entry = [...await lens(''), ...await lens('&background=true')].find(candidate => candidate.key === `own:${id}`);
    observe(`reader ${at}`, entry ? { private: entry.own?.private === true, withdrawn: entry.withdrawn, text: entry.contentHtml.replace(/<[^>]+>/g, '').trim() } : null);
    const list = await api('GET', `/items/${id}/private-versions?limit=50`);
    observe(`history ${at}`, list.status === 200 ? (list.json.items as { version: number; note: string | null; contentMd: string }[]).map(entry => ({ version: entry.version, note: entry.note, text: entry.contentMd })) : null);
  }

  await snapshot('after create');
  try { await run(); } finally { await api('PATCH', '/settings', { defaultVisibility: 'public' }); }
  async function run() { for (const [index, action] of history.actions.entries()) {
    let value: unknown;
    switch (action.op) {
      case 'edit': value = (await api('PATCH', `/items/${id}`, { contentMd: action.text })).status; break;
      case 'keep': value = (await api('POST', `/items/${id}/publish`, { visibility: 'private', note: action.note })).status; break;
      case 'default': value = (await api('PATCH', '/settings', { defaultVisibility: action.value })).status; break;
      case 'publish': { const response = await api('POST', `/items/${id}/publish`, { note: action.note, ...(action.visibility ? { visibility: action.visibility } : {}) }); value = response.status; if (response.status === 200 && response.json.version > 0) published = response.json.version; break; }
      case 'pin': value = (await api('PUT', `/items/${id}/versions/${published}/pin`, {})).status; break;
      case 'withdraw': value = (await api('POST', `/items/${id}/withdraw`, {})).status; break;
      case 'discard': value = (await api('DELETE', `/items/${id}`, {})).status; break;
      case 'refer': {
        // A thread that names the item: a new draft, or a published thread whose
        // pending changes add the reference.
        const text = action.form === 'link' ? `See [[${id}]].` : `![[${id}]]`;
        const thread = (await api('POST', '/items', { contentMd: action.pending ? 'Before the reference.' : text, kind: 'thread' })).json.id as string;
        if (action.pending) {
          if ((await api('POST', `/items/${thread}/publish`, {})).status !== 200) throw new Error('private-items fixture could not publish its referring thread');
          await api('PATCH', `/items/${thread}`, { contentMd: text });
        }
        const response = await api('POST', `/items/${thread}/publish`, {});
        const wire = await getPublic(`/blyg/items/${thread}.json`);
        const named = ((await api('GET', `/items/${id}`)).json as { status: string }).status;
        value = { named, publish: response.status, version: wire.status === 200 ? (await wire.json() as { version: number }).version : 0 };
        break;
      }
    }
    observe(action.op === 'refer' ? `block ${index}` : `action ${index}: ${action.op}`, value);
    await snapshot(`after ${index}`);
  } }
}

// Each law judges its own checkpoints; the trace and the model share an order.
function judge(prefixes: string[], law: string) {
  return (_history: History, trace: readonly Observation[], expected: Observation[]) => {
    const mine = (entries: readonly Observation[]) => entries.filter(entry => prefixes.some(prefix => entry.checkpoint.startsWith(prefix)));
    const actual = mine(trace), wanted = mine(expected);
    for (let i = 0; i < actual.length; i++) {
      const want = wanted[i];
      // The allowed set: a withdrawn item's listing may say either.
      const value = want && typeof want.value === 'object' && want.value && 'listed' in want.value
        ? { ...(want.value as object), listed: Object.fromEntries(Object.entries((want.value as { listed: Record<string, boolean | null> }).listed).map(([name, listed]) => [name, listed ?? (actual[i].value as { listed: Record<string, boolean> }).listed?.[name]])) }
        : want?.value;
      const mismatch = differs(actual[i].checkpoint, law, actual[i], want && { ...want, value });
      if (mismatch) return mismatch;
    }
    return differs(`${law} completion`, law, actual.length, wanted.length) ?? pass;
  };
}

const keepThenRaise: History[] = (['fragment', 'thread'] as const).map(kind => ({ name: `kept twice, raised, pinned and withdrawn: ${kind}`, kind, actions: [
  { op: 'edit', text: 'kept-words one' }, { op: 'keep', note: 'kept-note one' }, { op: 'edit', text: 'kept-words two' }, { op: 'keep', note: 'kept-note two' },
  { op: 'edit', text: 'public words' }, { op: 'publish', note: 'public note one' }, { op: 'pin' }, { op: 'edit', text: 'public words again' },
  { op: 'publish', note: 'public note two' }, { op: 'withdraw' },
] }));
const surfaceHistories: History[] = [
  ...keepThenRaise,
  { name: 'a private item edited after keeping stays private', kind: 'fragment', actions: [{ op: 'keep', note: 'kept-note' }, { op: 'edit', text: 'kept-words later' }, { op: 'keep', note: 'kept-note again' }] },
  { name: 'a plain draft is never on the surface', kind: 'thread', actions: [{ op: 'edit', text: 'kept-words draft' }] },
  { name: 'a public item with no private history', kind: 'fragment', actions: [{ op: 'publish', note: 'public note' }, { op: 'pin' }] },
];
const raiseHistories: History[] = [
  ...keepThenRaise,
  { name: 'raised once after one private version', kind: 'fragment', actions: [{ op: 'edit', text: 'kept-words' }, { op: 'keep', note: 'kept-note' }, { op: 'edit', text: 'public words' }, { op: 'publish', note: 'public note' }] },
  { name: 'raised after three private versions and pinned at v1', kind: 'thread', actions: [
    { op: 'keep', note: 'kept-note one' }, { op: 'keep', note: 'kept-note two' }, { op: 'keep', note: 'kept-note three' },
    { op: 'edit', text: 'public words' }, { op: 'publish', note: 'public note' }, { op: 'pin' },
  ] },
];
const defaultHistories: History[] = [
  { name: 'a private default keeps until a publish says public, then publishes publicly', kind: 'fragment', actions: [
    { op: 'default', value: 'private' }, { op: 'edit', text: 'kept-words one' }, { op: 'publish', note: 'kept-note one' }, { op: 'edit', text: 'kept-words two' }, { op: 'publish', note: 'kept-note two' },
    { op: 'edit', text: 'public words' }, { op: 'publish', note: 'public note', visibility: 'public' }, { op: 'edit', text: 'public words again' }, { op: 'publish', note: 'public note two' },
    { op: 'keep', note: 'kept-note late' },
  ] },
  { name: 'a public default publishes as before', kind: 'thread', actions: [{ op: 'edit', text: 'public words' }, { op: 'publish', note: 'public note' }] },
  { name: 'a private item publishes publicly once the default is public again', kind: 'thread', actions: [
    { op: 'default', value: 'private' }, { op: 'edit', text: 'kept-words' }, { op: 'publish', note: 'kept-note' }, { op: 'default', value: 'public' }, { op: 'edit', text: 'public words' }, { op: 'publish', note: 'public note' },
  ] },
];
const blockHistories: History[] = [...(['link', 'quote'] as const).flatMap(form => [false, true].map(pending => ({
  name: `a ${pending ? 'published thread\'s pending changes' : 'new thread'} naming it by ${form}: refused while private, accepted once raised`, kind: 'fragment' as const, actions: [
    { op: 'edit', text: 'kept-words' }, { op: 'keep', note: 'kept-note' }, { op: 'refer', form, pending },
    { op: 'edit', text: 'public words' }, { op: 'publish', note: 'public note' }, { op: 'refer', form, pending },
  ] as Op[],
}))),
  { name: 'a draft named by link is refused, accepted once public', kind: 'fragment', actions: [{ op: 'refer', form: 'link', pending: false }, { op: 'publish', note: 'public note' }, { op: 'refer', form: 'link', pending: false }] },
  { name: 'a withdrawn item named by quote is refused, a published thread\'s pending changes too', kind: 'fragment', actions: [
    { op: 'publish', note: 'public note' }, { op: 'withdraw' }, { op: 'refer', form: 'quote', pending: false }, { op: 'refer', form: 'link', pending: true },
  ] },
];
const historyHistories: History[] = [
  ...keepThenRaise,
  { name: 'kept three times, then discarded', kind: 'thread', actions: [
    { op: 'edit', text: 'kept-words one' }, { op: 'keep', note: 'kept-note one' }, { op: 'edit', text: 'kept-words two' }, { op: 'keep', note: '' },
    { op: 'edit', text: 'kept-words three' }, { op: 'keep', note: 'kept-note three' }, { op: 'discard' },
  ] },
  { name: 'a draft is discarded with no private history', kind: 'fragment', actions: [{ op: 'edit', text: 'kept-words draft' }, { op: 'discard' }] },
  { name: 'a raised item cannot be discarded and keeps its private history', kind: 'fragment', actions: [
    { op: 'edit', text: 'kept-words' }, { op: 'keep', note: 'kept-note' }, { op: 'edit', text: 'public words' }, { op: 'publish', note: 'public note' }, { op: 'discard' },
  ] },
  defaultHistories[0],
];

// Reach is read from the plan, stepped as far as the trace got.
const REACH = { surface: ['draft item', 'private item', 'private item edited', 'public item', 'withdrawn item'], raise: ['raised after private versions', 'pinned first public version', 'published after raise'], block: ['refused while private', 'pending changes refused', 'draft refused', 'withdrawn refused', 'accepted once public'], default: ['kept by default', 'public by request under a private default', 'public item under a private default', 'raised by a public default'], reader: ['private item in reader', 'raised item in reader', 'withdrawn item in reader', 'draft not in reader'], history: ['no private versions', 'private versions listed', 'private history kept after raise', 'private item discarded', 'draft discarded', 'public item discard refused'] };
const ALL = Object.values(REACH).flat();
function reached(history: History, trace: readonly Observation[]) {
  const done = new Set(trace.map(entry => entry.checkpoint)), state = initial(), out = new Set<string>();
  if (done.has('surface after create')) { out.add('draft item'); out.add('draft not in reader'); out.add('no private versions'); }
  history.actions.forEach((action, index) => {
    if (!done.has(`surface after ${index}`)) return;
    const was = state.status, kept = state.private;
    step(state, action);
    if (action.op === 'publish' && !action.visibility && state.def === 'private') out.add(was === 'public' ? 'public item under a private default' : 'kept by default');
    if (action.op === 'publish' && action.visibility === 'public' && state.def === 'private') out.add('public by request under a private default');
    if (action.op === 'publish' && !action.visibility && state.def === 'public' && was === 'private') out.add('raised by a public default');
    if (state.status === 'private') out.add('private item in reader');
    if (state.status === 'public' && kept) out.add('raised item in reader');
    if (state.status === 'withdrawn') out.add('withdrawn item in reader');
    if (state.status === 'private') out.add(action.op === 'edit' ? 'private item edited' : 'private item');
    if (state.status === 'public') out.add('public item');
    if (state.status === 'withdrawn') out.add('withdrawn item');
    if (action.op === 'publish' && was === 'private') out.add('raised after private versions');
    if (action.op === 'publish' && was === 'public' && kept) out.add('published after raise');
    if (action.op === 'pin' && state.public === 1 && kept) out.add('pinned first public version');
    if (action.op === 'refer') out.add(was === 'public' ? 'accepted once public' : was === 'draft' ? 'draft refused' : was === 'withdrawn' ? 'withdrawn refused' : action.pending ? 'pending changes refused' : 'refused while private');
    if (state.log.length && state.status !== 'gone') out.add(state.public ? 'private history kept after raise' : 'private versions listed');
    if (action.op === 'discard') out.add(state.status !== 'gone' ? 'public item discard refused' : kept ? 'private item discarded' : 'draft discarded');
  });
  return out;
}
const reach = (law: keyof typeof REACH) => ({ states: REACH[law], measured: ALL.filter(state => !REACH[law].includes(state)) });
const label = (history: History) => history.name;
oracleProperty({
  id: 'private-items-public-surface',
  owns: ['src/served-publicly.ts', 'src/model.ts#publishPrivately', 'src/api.ts#publishItemOperation', 'src/transclusion.ts#resolveTarget', 'src/index.ts#makeApp'],
  law: { statement: 'For every history of edits, private and public publications, pins and withdrawals, each public route serves or lists an own item only while it is public or withdrawn: a draft or private item 404s on its document, version documents and page, and is in no listing.', authority: 'Decision by Venkat Rao (GitHub vgururao), 2026-11-22: every public route serves or lists an own item only while it is public or withdrawn. Decision #7; blygger-spec docs/sealed-content-build-plan.md §1 0a; private-items proposal §8.1.', limits: 'Item and version documents, page, feed, index, archive, home and one public hopper. A withdrawn item\'s listings accept either answer. Search, picker, tokens, mentions and MCP are not judged here.' },
  histories: { enumerated: surfaceHistories, ...reach('surface') }, label, model, driver, reached,
  check: judge(['surface '], 'public surface'),
  calibrations: [{ name: 'a private item listed in the feed', law: 'public surface', history: { enumerated: 2 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'surface after 0' ? { ...entry, value: { ...(entry.value as object), listed: { ...(entry.value as { listed: object }).listed, feed: true } } } : entry) }],
});
oracleProperty({
  id: 'private-items-raise-to-public',
  owns: ['src/served-publicly.ts', 'src/model.ts#publishPrivately', 'src/api.ts#publishItemOperation', 'src/transclusion.ts#resolveTarget', 'src/index.ts#makeApp'],
  law: { statement: 'For every item published privately any number of times and then published, the first public version is v1, the public changelog holds only public publications, and no private note or privately kept text appears on any public route.', authority: 'Decision #94 (private versions are studio history; the public counter starts at 1). Decision by Venkat Rao (GitHub vgururao), 2026-11-22: public versions start at v1, and nothing from the private history appears publicly.', limits: 'Notes and text marked by these histories only; one item per history. The private counter itself is not observed on any public route, which is the claim.' },
  histories: { enumerated: raiseHistories, ...reach('raise') }, label, model, driver, reached,
  check: judge(['raise ', 'action '], 'raise to public'),
  calibrations: [{ name: 'the first public version continues the private counter', law: 'raise to public', history: { enumerated: 2 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'raise after 3' ? { ...entry, value: { ...(entry.value as object), version: 2 } } : entry) }],
});
oracleProperty({
  id: 'private-items-publish-block',
  owns: ['src/served-publicly.ts', 'src/model.ts#publishPrivately', 'src/api.ts#publishItemOperation', 'src/transclusion.ts#resolveTarget', 'src/index.ts#makeApp'],
  law: { statement: 'For every working copy that names an own private, draft or withdrawn item by [[id]] or ![[id]], a published item\'s pending changes included, public publication is refused and the public version does not move; once the named item is public, the same publication succeeds.', authority: 'private-items proposal §3.4 and §8 answer 2. Decisions by Venkat Rao (GitHub vgururao): publish fails while the working copy names a private item (2026-11-22); a draft or withdrawn target is refused like a private one (2026-11-23).', limits: 'Own items named by link or quote from a thread; the named item is a draft, private, public or withdrawn. Imported targets and thread cycles are not judged here.' },
  histories: { enumerated: blockHistories, ...reach('block') }, label, model, driver, reached,
  check: judge(['block '], 'publish block'),
  calibrations: [{ name: 'a link to a private item publishes', law: 'publish block', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'block 2' ? { ...entry, value: { named: 'private', publish: 200, version: 1 } } : entry) }],
});
oracleProperty({
  id: 'private-items-default-visibility',
  owns: ['src/api.ts#publishItemOperation', 'src/model.ts#publishPrivately', 'src/model.ts#getSettings'],
  law: { statement: 'For every publish that names no visibility, an item that has never been public is published as the blyg\'s default visibility says; an item already public publishes publicly; a named visibility is honoured exactly, and a private publish of a public item is refused.', authority: 'Decision by Venkat Rao (GitHub vgururao), 2026-11-22: a default-private blyg is a private notebook that occasionally shares; a tool goes public only by saying so.', limits: 'Owner cookie over REST; one item per history. MCP reaches the same operation and is not driven here.' },
  histories: { enumerated: defaultHistories, ...reach('default') }, label, model, driver, reached,
  check: judge(['action ', 'raise '], 'default visibility'),
  calibrations: [{ name: 'an omitted visibility publishes publicly under a private default', law: 'default visibility', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'raise after 2' ? { ...entry, value: { owner: { status: 'public', version: 1 }, version: 1, changelog: [{ version: 1, note: 'kept-note one' }], leaked: false } } : entry) }],
});
const readerHistories: History[] = [...keepThenRaise, surfaceHistories[2], surfaceHistories[3], defaultHistories[0]];
oracleProperty({
  id: 'private-items-owner-reader',
  owns: ['src/reading-data.ts#readingEntries', 'src/reading-data.ts#identitySql', 'src/model.ts#publishPrivately'],
  law: { statement: 'For every history, the owner\'s reader lists an own item while it is public, withdrawn or private and never as a draft; a private item is marked private and shows its latest private version, a public one its latest public version.', authority: 'Decision by Venkat Rao (GitHub vgururao), 2026-11-22: "my blyg" must show private items, or a private notebook cannot be browsed in reader view.', limits: 'The "my blyg" source (sub=own), foreground and Background lenses, plain-text versions. Ordering among own items and the cache work are the reader oracles\'.' },
  histories: { enumerated: readerHistories, ...reach('reader') }, label, model, driver, reached,
  check: judge(['reader '], 'owner reader'),
  calibrations: [{ name: 'a private item missing from the reader', law: 'owner reader', history: { enumerated: 2 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'reader after 0' ? { ...entry, value: null } : entry) }],
});
oracleProperty({
  id: 'private-items-private-history',
  owns: ['src/read-api.ts#listPrivateVersionsOperation', 'src/model.ts#publishPrivately', 'src/model.ts#discardDraft', 'src/api.ts#deleteItemOperation'],
  law: { statement: 'For every history, the owner\'s private-versions list holds exactly the item\'s private publications, p1 to pn, newest first, each with its note and the text it kept; raising to public keeps them; discarding an item that was never public removes it and its private versions, and a public item cannot be discarded.', authority: 'Decision by Venkat Rao (GitHub vgururao), 2026-11-23: private versions are listed as p1, p2, … and stay as studio history; discard removes a never-public item with its private versions. Decision #94; decision #8 (a public item is withdrawn, never deleted).', limits: 'Owner cookie over REST, one item per history, plain text. A discard that races a publication is the draft-authority oracle\'s; a private publish that races a write is the private-conflict oracle\'s.' },
  histories: { enumerated: historyHistories, ...reach('history') }, label, model, driver, reached,
  check: judge(['history ', 'action '], 'private history'),
  calibrations: [{ name: 'a discarded item keeps its private versions', law: 'private history', history: { enumerated: 2 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'history after 6' ? { ...entry, value: [{ version: 3, note: 'kept-note three', text: 'kept-words three' }] } : entry) }],
});
