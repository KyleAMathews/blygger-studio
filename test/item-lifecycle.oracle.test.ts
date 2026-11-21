/**
 * Published history moves forward; restoring an old version changes the draft.
 * A pin keeps its published snapshot even after editing, withdrawal and restoration.
 * A final-content-only assertion could miss a rewound counter or rewritten history.
 *
 * Contract: docs/api.md defines restore-without-publish and permanent pins. The
 * established restore-version acceptance tests define the forward-only counter.
 * These are local content laws, not HTTP or OAuth requirements.
 * Model: working copy content, status, dirty flag, authored kind and immutable versions.
 * Withdrawal appends an empty withdrawn snapshot; restore copies text without
 * removing any version; restoring the current version is discard and leaves the copy clean. Pinning changes visibility of one existing snapshot.
 * History grammar: fragment/thread, plain text including empty strings and at most ten generated
 * choices. Legal operations depend on model state; restore/pin target normal
 * published snapshots. A fixed history forces repeated pin and restore-after-withdraw.
 * Driver: named generated SDK operations through SELF to the real Worker and D1.
 * Refinement: after creation and every awaited action, compare owner working state,
 * ordered history, public current projection, pin visibility and pinned wire bytes.
 * Limits: no TK, transclusions, forks, deletion, concurrent publication or arbitrary
 * Markdown rendering. Retaining first pin bytes is a metamorphic check, not an
 * independent expected encoding. docs/testing.md records this bounded domain.
 */
import { SELF } from 'cloudflare:test';
import fc from 'fast-check';
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { BlyggerApi, createBlyggerClient, unwrap } from '../sdk/dist/browser.js';
import { BASE, login, testVersionHistory } from './helpers.ts';
import { initial, reference, resolveInstructions, step, type Action, type Plan } from './item-lifecycle-reference.ts';

const instruction = fc.record({ choice: fc.nat(30), version: fc.nat(30), text: fc.integer({ min: 0, max: 999 }) });
const histories = fc.record({ kind: fc.constantFrom('fragment' as const, 'thread' as const), instructions: fc.array(instruction, { minLength: 1, maxLength: 10 }) });
// Same production operations and settled checkpoints as the original oracle.
// The request preconditions follow the independent reference as before; only
// the check compares its predictions with the returned state.
async function driver({ kind, actions }: Plan, observe: (checkpoint: string, value: unknown) => void) {
  const ownerCookie = await login();
  const client = createBlyggerClient({ baseUrl: BASE + '/blyg/api', headers: { cookie: ownerCookie }, fetch: (input, init) => SELF.fetch(input instanceof Request ? input : new Request(input, init)) });
  const created = await unwrap(BlyggerApi.createItem({ client, body: { kind, contentMd: 'initial' } }));
  const id = created.id, state = initial(kind), pinnedSnapshots = new Map<number, string>();
  async function compare() {
    const owner = await unwrap(BlyggerApi.getItem({ client, path: { id } }));
    observe('lifecycle private revision', owner.revision);
    observe('lifecycle owner working copy', { content: owner.contentMd, status: owner.status, dirty: owner.dirty, version: owner.version, kind: owner.kind });
    const versions = await testVersionHistory(ownerCookie, id);
    observe('lifecycle immutable history', versions.map(v => ({ content: v.contentMd, pinned: v.pinned, kind: v.kind })));
    const current = await SELF.fetch(`${BASE}/blyg/items/${id}.json`);
    observe('lifecycle public visibility', current.status);
    if (state.versions.length) {
      const body = await current.json() as { version: number; kind: string; content_md: string };
      observe('lifecycle public current version', { version: body.version, kind: body.kind, content: body.content_md });
    }
    for (const [i, snapshot] of state.versions.entries()) {
      const pinned = await SELF.fetch(`${BASE}/blyg/items/${id}/v${i + 1}.json`);
      observe('lifecycle pin visibility', { version: i + 1, status: pinned.status });
      if (snapshot.pinned) {
        const bytes = await pinned.text(), body = JSON.parse(bytes);
        observe('lifecycle pinned content', { version: body.version, content: body.content_md, kind: body.kind });
        if (!pinnedSnapshots.has(i + 1)) pinnedSnapshots.set(i + 1, bytes);
        // Observe the complete-byte relation without including per-fixture IDs
        // or timestamps in the cross-history determinism comparison.
        observe('lifecycle immutable pinned bytes', bytes === pinnedSnapshots.get(i + 1));
      }
    }
  }
  try {
    await compare();
    for (const action of actions) {
      if (action.op === 'edit') await unwrap(BlyggerApi.updateItem({ client, path: { id }, body: { contentMd: action.value, expectedRevision: state.revision } }));
      if (action.op === 'publish') await unwrap(BlyggerApi.publishItem({ client, path: { id }, body: { expectedRevision: state.revision } }));
      if (action.op === 'withdraw') await unwrap(BlyggerApi.withdrawItem({ client, path: { id }, body: { expectedRevision: state.revision } }));
      if (action.op === 'restore') await unwrap(BlyggerApi.restoreItem({ client, path: { id }, body: { version: action.version!, expectedRevision: state.revision } }));
      if (action.op === 'pin') observe('lifecycle pin idempotence', (await unwrap(BlyggerApi.pinItem({ client, path: { id, version: action.version! }, body: { expectedRevision: state.revision } }))).already);
      step(state, action); await compare();
    }
  } catch (error) { observe('lifecycle operation error', error instanceof Error ? error.message : String(error)); }
}
const check = (_plan: Plan, trace: readonly Observation[], expected: Observation[]) => {
  // A correct received prefix says nothing about its missing tail. Keep its
  // interruption primary even when later actions would repeat this checkpoint.
  for (let i = 0; i < trace.length; i++) {
    const mismatch = differs(trace[i].checkpoint, 'forward history and immutable pins', trace[i], expected[i]);
    if (mismatch) return mismatch;
  }
  return differs('lifecycle completion', 'forward history and immutable pins', trace.length, expected.length) ?? pass;
};
const law = { statement: 'For every legal serial edit/publish/withdraw/restore/pin history, working state, forward version history and public visibility match the reference, and an existing pin retains its complete original bytes.', authority: 'docs/api.md restore and permanent-pin contract, established restore-version tests and existing lifecycle model', limits: 'Plain-text fragments/threads and normal published restore targets; no TK, transclusion, forks, deletion or concurrent publication.' };
const pinned: Action[] = [{ op: 'publish' }, { op: 'pin', version: 1 }, { op: 'pin', version: 1 }, { op: 'edit', value: 'second' }, { op: 'publish' }, { op: 'withdraw' }, { op: 'restore', version: 1 }, { op: 'publish' }];
const empty: Action[] = [{ op: 'edit', value: '' }, { op: 'publish' }, { op: 'pin', version: 1 }, { op: 'withdraw' }, { op: 'restore', version: 1 }, { op: 'publish' }, { op: 'pin', version: 3 }, { op: 'withdraw' }];

// Required reach uses the resolved legal actions and the number of completed
// owner snapshots. The independent lifecycle state supplies premises only;
// returned fields and pinned bytes are still judged by the unchanged check.
const lifecycleStates = ['fragment working copy', 'thread working copy', 'unpublished draft', 'published snapshot', 'idempotent pin', 'pinned snapshot through edit', 'pinned snapshot through withdrawal', 'restore after withdrawal', 'restore without publication', 'restore current version', 'empty publication', 'withdrawal snapshot'];
function lifecycleReach({ kind, actions }: Plan, trace: readonly Observation[]) {
  const snapshots = trace.filter(entry => entry.checkpoint === 'lifecycle owner working copy').length;
  const reached = new Set<string>(), state = initial(kind);
  if (snapshots) { reached.add(kind + ' working copy'); reached.add('unpublished draft'); }
  for (const [index, action] of actions.entries()) {
    if (snapshots <= index + 1) break;
    const hadPin = state.versions.some(version => version.pinned), withdrawn = state.status === 'withdrawn';
    const alreadyPinned = action.op === 'pin' && state.versions[action.version! - 1].pinned;
    const versions = state.versions.length;
    const restoresCurrent = action.op === 'restore' && action.version === versions;
    step(state, action);
    if (state.status === 'public') reached.add('published snapshot');
    if (alreadyPinned) reached.add('idempotent pin');
    if (hadPin && action.op === 'edit') reached.add('pinned snapshot through edit');
    if (hadPin && action.op === 'withdraw') reached.add('pinned snapshot through withdrawal');
    if (withdrawn && action.op === 'restore') reached.add('restore after withdrawal');
    if (action.op === 'restore' && state.versions.length === versions) reached.add('restore without publication');
    if (restoresCurrent) reached.add('restore current version');
    if (action.op === 'publish' && state.content === '') reached.add('empty publication');
    if (action.op === 'withdraw') reached.add('withdrawal snapshot');
  }
  return reached;
}
// These encodings stay inside the existing arbitrary and resolve to the two
// original enumerated operation sequences. The old fixed regression and exact
// enumerated histories remain intact.
const pinnedInstructions = [{ choice: 1, version: 0, text: 0 }, { choice: 4, version: 0, text: 0 }, { choice: 4, version: 0, text: 0 }, { choice: 0, version: 0, text: 1 }, { choice: 1, version: 0, text: 0 }, { choice: 2, version: 0, text: 0 }, { choice: 2, version: 0, text: 0 }, { choice: 1, version: 0, text: 0 }];
const emptyInstructions = [{ choice: 0, version: 0, text: 0 }, { choice: 1, version: 0, text: 0 }, { choice: 4, version: 0, text: 0 }, { choice: 2, version: 0, text: 0 }, { choice: 2, version: 0, text: 0 }, { choice: 1, version: 0, text: 0 }, { choice: 4, version: 1, text: 0 }, { choice: 2, version: 0, text: 0 }];
const lifecycleConstructions = (['fragment', 'thread'] as const).flatMap(kind => [
  { name: 'pin edit withdrawal and restore: ' + kind, enters: [kind + ' working copy', 'unpublished draft', 'published snapshot', 'idempotent pin', 'pinned snapshot through edit', 'pinned snapshot through withdrawal', 'restore after withdrawal', 'restore without publication', 'withdrawal snapshot'], build: () => ({ kind, instructions: pinnedInstructions }) },
  { name: 'restore current version discards edits: ' + kind, enters: [kind + ' working copy', 'unpublished draft', 'published snapshot', 'restore without publication', 'restore current version'], build: () => ({ kind, instructions: [{ choice: 1, version: 0, text: 0 }, { choice: 0, version: 0, text: 1 }, { choice: 3, version: 0, text: 0 }] }) },
  { name: 'empty publication and withdrawal: ' + kind, enters: [kind + ' working copy', 'unpublished draft', 'published snapshot', 'pinned snapshot through withdrawal', 'restore after withdrawal', 'restore without publication', 'empty publication', 'withdrawal snapshot'], build: () => ({ kind, instructions: emptyInstructions }) },
]);
oracleProperty({
  id: 'item-lifecycle', owns: ['src/model.ts#publish', 'src/model.ts#restoreVersion', 'src/model.ts#pinVersion', 'src/model.ts#withdraw'],
  law, histories: { arbitrary: histories, runs: 8, fixedSeeds: [20261001], states: lifecycleStates, constructed: lifecycleConstructions, fixed: [{ name: 'publish pin withdrawal and restoration', history: { kind: 'thread' as const, instructions: [{ choice: 1, version: 0, text: 0 }, { choice: 4, version: 0, text: 1 }, { choice: 2, version: 0, text: 2 }, { choice: 2, version: 0, text: 3 }] } }] },
  resolve: resolveInstructions, model: reference, driver, reached: lifecycleReach, check,
  calibrations: [{ name: 'version counter rewinds', law: 'forward history and immutable pins', history: { fixed: 'publish pin withdrawal and restoration' }, corrupt: trace => trace.map((entry, i) => i === 4 ? { ...entry, value: 0 } : entry) }],
});
oracleProperty({
  id: 'item-lifecycle-witnesses', owns: ['src/model.ts#publish', 'src/model.ts#restoreVersion', 'src/model.ts#pinVersion', 'src/model.ts#withdraw'],
  law, histories: { enumerated: (['fragment', 'thread'] as const).flatMap(kind => [{ kind, actions: pinned, name: 'preserves a pinned history through restore and withdrawal: ' + kind }, { kind, actions: empty, name: 'keeps empty publications distinct from withdrawals: ' + kind }]), states: lifecycleStates.filter(state => state !== 'restore current version') },
  label: plan => plan.name, model: reference, driver, reached: lifecycleReach, check,
  calibrations: [{ name: 'changed pinned snapshot', law: 'forward history and immutable pins', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'lifecycle pinned content' ? { ...entry, value: { ...(entry.value as object), content: 'changed' } } : entry) }],
});
