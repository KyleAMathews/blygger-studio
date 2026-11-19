/**
 * Expiry and prefix pagination must agree after every storage change.
 * A single get cannot expose lost pages, wildcard prefix matching or stale expiry.
 *
 * Contract: OAuthStorage's KV-shaped string adapter, documented in docs/auth-oracles.md.
 * This adapter law is local; OAuth RFCs do not specify its SQL or cursor format.
 * Model: a plain Map records strings and absolute expiry. Reads recompute literal
 * startsWith matching and retain only records whose expiry is strictly after now.
 * History grammar: put/overwrite/delete/time, six keys, punctuation and nullable TTL.
 * Fixed reconstruction forces overwrite, exact expiry and multiple pages. Generated
 * fixed/random campaigns sample bounded histories; they do not exhaust this grammar.
 * Driver: actual OAuthStorage and D1 with controlled Date and two-key pages.
 * Refinement: complete ordered key sequences and JSON values after every action.
 * Duplicates and loss remain visible; observations are not converted to a Set.
 * Limits: no concurrent writer/list snapshot guarantee, malformed cursor grammar or
 * all Unicode sorting. The model imports no SQL, cursor codec or prefix helper.
 */
import { env } from 'cloudflare:test';
import { vi } from 'vitest';
import fc from 'fast-check';
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { OAuthStorage } from '../src/oauth-storage.ts';

type StorageAction = { op: string; key: string; value: number; ttl: number | null; seconds: number };
const input = fc.array(fc.record({ op: fc.constantFrom('put', 'delete', 'advance'), key: fc.constantFrom('grant:a', 'grant:b', 'grant:%', 'grant:_', 'client:a', 'consent:a'), value: fc.integer({ min: -10, max: 10 }), ttl: fc.constantFrom(null, 1, 60, 600), seconds: fc.constantFrom(0, 1, 59, 60, 600) }), { minLength: 1, maxLength: 18 });
const prefixes = ['', 'grant:', 'grant:%', 'grant:_', 'client:'];
const reconstruction = (): StorageAction[] => ['grant:a', 'grant:b', 'grant:%', 'grant:_', 'client:a'].map<StorageAction>(key => ({ op: 'put', key, ttl: 60, seconds: 0, value: 1 })).concat([{ op: 'put', key: 'grant:a', ttl: null, seconds: 0, value: 2 }, { op: 'delete', key: 'grant:b', ttl: null, seconds: 0, value: 0 }, { op: 'advance', key: 'grant:a', ttl: null, seconds: 59, value: 0 }, { op: 'advance', key: 'grant:a', ttl: null, seconds: 1, value: 0 }]);
// The irrelevant key on advance is a legal grammar key. The operations, time
// steps and expected observations are the original fixed reconstruction.
const storageStates = ['empty prefix', 'literal percent', 'literal underscore', 'multiple pages', 'overwrite', 'deletion', 'permanent replacement', 'last live second', 'exact expiry'];
const histories = { arbitrary: input, runs: 8, fixedSeeds: [20261001], states: storageStates, constructed: [
  { name: 'overwrite delete exact expiry literal wildcards and multiple pages', enters: storageStates, build: reconstruction },
] };
// Count receiving checkpoints, then inspect the independent input facts at each
// completed action. Reach never depends on the returned list/get being correct.
function storageReach(actions: StorageAction[], trace: readonly Observation[]) {
  const records = new Map<string, { value: number; expires: number | null }>(), reached = new Set<string>();
  const pages = trace.filter(entry => entry.checkpoint === 'OAuth storage prefix pages').length;
  const gets = trace.filter(entry => entry.checkpoint === 'OAuth storage expiry').length;
  let now = 0, reads = 0;
  actions.forEach((action, index) => {
    const previous = records.get(action.key);
    if (action.op === 'put') records.set(action.key, { value: action.value, expires: action.ttl === null ? null : now + action.ttl });
    if (action.op === 'delete') records.delete(action.key);
    if (action.op === 'advance') now += action.seconds;
    reads += records.size;
    if (pages < (index + 1) * prefixes.length || gets < reads) return;
    const live = [...records].filter(([, row]) => row.expires === null || row.expires > now).map(([key]) => key);
    if (prefixes.some(prefix => !live.some(key => key.startsWith(prefix)))) reached.add('empty prefix');
    if (live.includes('grant:%')) reached.add('literal percent');
    if (live.includes('grant:_')) reached.add('literal underscore');
    if (prefixes.some(prefix => live.filter(key => key.startsWith(prefix)).length > 2)) reached.add('multiple pages');
    if (action.op === 'put' && previous && previous.value !== action.value) reached.add('overwrite');
    if (action.op === 'delete' && previous) reached.add('deletion');
    if (action.op === 'put' && previous?.expires !== null && previous !== undefined && action.ttl === null) reached.add('permanent replacement');
    if ([...records.values()].some(row => row.expires !== null && row.expires - now === 1)) reached.add('last live second');
    if ([...records.values()].some(row => row.expires === now)) reached.add('exact expiry');
  });
  return reached;
}
function model(actions: StorageAction[]) {
  const map = new Map<string, { value: number; expires: number | null }>();
  let now = 1800000000;
  const trace: Observation[] = [];
  for (const action of actions) {
    if (action.op === 'put') map.set(action.key, { value: action.value, expires: action.ttl === null ? null : now + action.ttl });
    if (action.op === 'delete') map.delete(action.key);
    if (action.op === 'advance') now += action.seconds;
    for (const prefix of prefixes) {
      const keys = [...map].filter(([key, record]) => key.startsWith(prefix) && (record.expires === null || record.expires > now)).map(([key]) => key).sort();
      const pages = Array.from({ length: Math.max(1, Math.ceil(keys.length / 2)) }, (_, index) => {
        const end = Math.min((index + 1) * 2, keys.length), complete = end === keys.length;
        return { complete, more: !complete };
      });
      trace.push({ checkpoint: 'OAuth storage prefix pages', value: { keys, pages } });
    }
    for (const [, record] of map) trace.push({ checkpoint: 'OAuth storage expiry', value: record.expires !== null && record.expires <= now ? null : { value: record.value } });
  }
  return trace;
}
async function driver(actions: StorageAction[], observe: (checkpoint: string, value: unknown) => void) {
  await env.DB.prepare('DELETE FROM oauth_records').run();
  const storage = new OAuthStorage(env.DB), keys = new Set<string>();
  let now = 1800000000;
  const clock = vi.spyOn(Date, 'now').mockImplementation(() => now * 1000);
  try {
    for (const action of actions) {
      if (action.op === 'put') { keys.add(action.key); await storage.put(action.key, JSON.stringify({ value: action.value }), action.ttl === null ? undefined : { expirationTtl: action.ttl }); }
      if (action.op === 'delete') { keys.delete(action.key); await storage.delete(action.key); }
      if (action.op === 'advance') now += action.seconds;
      for (const prefix of prefixes) {
        const observed: string[] = [], metadata: { complete: boolean; more: boolean }[] = [];
        let cursor = '', pages = 0;
        do {
          const page = await storage.list({ prefix, cursor, limit: 2 });
          metadata.push({ complete: page.list_complete, more: typeof page.cursor === 'string' && page.cursor.length > 0 });
          observed.push(...page.keys.map(key => key.name)); cursor = page.list_complete ? '' : page.cursor;
          if (++pages > keys.size + 1) { observe('driver error', 'storage cursor did not progress'); return; }
        } while (cursor);
        observe('OAuth storage prefix pages', { keys: observed, pages: metadata });
      }
      for (const key of keys) observe('OAuth storage expiry', await storage.get(key, 'json'));
    }
  } catch (error) { observe('driver error', error instanceof Error ? error.message : String(error)); }
  finally { clock.mockRestore(); }
}
const values = (trace: readonly Observation[], checkpoint: string) => trace.filter(entry => entry.checkpoint === checkpoint).map(entry => entry.value);
// Preserve the complete-array predicate while distinguishing a wrong received
// value from an absent tail. Only the former can outrank a later interruption.
function checkStorage(trace: readonly Observation[], expected: readonly Observation[], checkpoint: string, law: string) {
  const actual = trace.filter(entry => entry.checkpoint === checkpoint), wanted = values(expected, checkpoint);
  const mismatch = differs('OAuth storage completion', law, actual.map(entry => entry.value), wanted);
  if (mismatch) {
    const received = actual.find((entry, index) => index >= wanted.length || differs(entry.checkpoint, law, entry.value, wanted[index]));
    if (received) return { ...mismatch, checkpoint: received.checkpoint };
  }
  return differs('driver error', law, values(trace, 'driver error'), []) ?? mismatch ?? pass;
}

oracleProperty({
  id: 'oauth-storage-pages', owns: ['src/oauth-storage.ts#OAuthStorage.list'],
  law: { statement: 'For every bounded storage history, complete two-key cursor walks return exactly the sorted live keys with each literal prefix, without loss or duplication, with list_complete true and an empty cursor exactly at exhaustion.', authority: 'docs/auth-oracles.md OAuthStorage contract and existing prefix-page oracle', limits: 'Six ASCII fixture keys and serial writes; no concurrent snapshot or malformed-cursor claim.' },
  histories, model, driver, reached: storageReach,
  check: (_actions, trace, expected) => checkStorage(trace, expected, 'OAuth storage prefix pages', 'literal prefix pages'),
  calibrations: ['loss', 'duplicates', 'wrong prefix', 'missing completion'].map(kind => ({ name: kind, law: 'literal prefix pages', history: { constructed: 'overwrite delete exact expiry literal wildcards and multiple pages' }, corrupt: (trace: readonly Observation[]) => trace.map((entry, i) => i !== 0 ? entry : { ...entry, value: kind === 'missing completion' ? { ...(entry.value as object), pages: [] } : { ...(entry.value as object), keys: kind === 'loss' ? [] : kind === 'duplicates' ? ['grant:a', 'grant:a'] : ['grant:a', 'client:a'] } }) })),
});
oracleProperty({
  id: 'oauth-storage-expiry', owns: ['src/oauth-storage.ts#OAuthStorage.get', 'src/oauth-storage.ts#OAuthStorage.put', 'src/oauth-storage.ts#OAuthStorage.delete'],
  law: { statement: 'For every bounded storage history, gets return the last stored JSON value until its exclusive expiry boundary, and null at or after expiry; overwrite and deletion replace prior state.', authority: 'docs/auth-oracles.md OAuthStorage contract and existing expiry oracle', limits: 'Serial histories with controlled Date.now; nullable TTL and existing boundary neighbors only.' },
  histories, model, driver, reached: storageReach,
  check: (_actions, trace, expected) => checkStorage(trace, expected, 'OAuth storage expiry', 'exclusive expiry'),
  calibrations: [{ name: 'expired value survives', law: 'exclusive expiry', history: { constructed: 'overwrite delete exact expiry literal wildcards and multiple pages' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'OAuth storage expiry' && entry.value === null ? { ...entry, value: { value: 1 } } : entry) }],
});
