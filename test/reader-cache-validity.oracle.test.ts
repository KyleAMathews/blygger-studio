/**
 * The reader's stored positions preserve a fresh ranking after source changes.
 * This oracle owns ensureReaderOrder's cache validity at the readingData page
 * boundary, including own publication inputs and subscription identities.
 *
 * readingData(..., 'pace-layered') // → the same identities as fresh ranking
 * pinOwnItem(); continueReading() // → cursor-expired after the order changes
 *
 * An imported-only history cannot tell whether own publishing invalidates a
 * warm cache. Here each source edit is followed by both a cached page and a
 * fresh, uncached computation. The cache and fresh paths share the history
 * loader and ranking algorithm as a trusted base: this relation judges cache
 * validity, independently of the revision triggers, not the ranking algorithm.
 * The independent array model in reader-work.oracle.test.ts judges the simple
 * ranking rules; reader-order.test.ts retains richer algorithm examples.
 *
 * For every source history, caching preserves the uncached ordered identities
 * without derived writes for unchanged working-copy inputs.
 * For every changed own pin, a prior continuation expires. Sources:
 * docs/pace-layered-feed.md and docs/api.md generation-bound cursor contract;
 * Kyle Mathews (GitHub KyleAMathews), 2026-11-22, #170 work-preservation decision.
 * The model predicts equality, not captured expected production values. Own
 * working-copy edits also owe zero derived writes, measured through native D1.
 *
 * Source edits preserve the published-item invariant: removing its last
 * version first removes the item from the public set in the same transaction.
 * Histories vary edit order and repetition across own items/versions, imported
 * facts and subscription identity/origin. Missing cache state and epoch changes
 * have their materialization witness in reader-work. Limits: local D1, ten live
 * entries with pins and quotes; this relation does not independently judge the
 * trusted loader/ranker's pin-weight formula or malformed stored documents.
 * Upgrade histories also carry a cache built while a subscription was absent
 * and a cursor issued before an own pin under the predecessor triggers. The
 * migration must discard those old proofs before serving the next page.
 * Overlapping builds also preserve the same completed-page relation: an old
 * publisher cannot replace a newer build between another read's preparation
 * and selection. Controlled native D1 barriers exercise that overlap below.
 */
import { measureD1 } from '../test-oracles/d1-work.ts';
import { env } from 'cloudflare:test';
import fc from 'fast-check';
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { readingData } from '../src/reading-data.ts';
import { loadReaderHistory, readerPositions } from '../src/feeds/reader-order.ts';
import { ensureReaderOrder } from '../src/feeds/reader-order-cache.ts';
import { withOracleStorage } from './oracle-storage.ts';
import { applyReaderWorkMigration, installPreviousReaderTrigger } from './reader-upgrade-oracle.ts';

const actions = ['own-publish', 'own-draft', 'own-time', 'own-pin', 'own-quotes', 'own-kind', 'own-delete-version', 'own-add-version', 'own-unpublish', 'own-remove', 'import-time', 'import-pin', 'import-quotes', 'import-state', 'import-remove', 'source-origin', 'source-id', 'source-remove', 'source-add', 'upgrade'] as const;
type Action = typeof actions[number];
const at = (hour: number) => new Date(Date.UTC(2026,0,1)+hour*3_600_000).toISOString();
const law = 'cached ranking preserves fresh identities';
const histories = {
  arbitrary: fc.array(fc.constantFrom(...actions), { minLength: 0, maxLength: 20 }), runs: 25, fixedSeeds: [1702026],
  states: ['own-input', 'imported-input', 'subscription-input', 'upgrade-cache'],
  constructed: [
    { name: 'own publishing', build: () => ['own-pin','own-time','own-quotes','own-kind','own-delete-version','own-add-version','own-draft','own-publish','own-unpublish','own-remove'] as Action[], enters: ['own-input'] },
    { name: 'imported publishing', build: () => ['import-time','import-pin','import-quotes','import-state','import-remove'] as Action[], enters: ['imported-input'] },
    { name: 'subscription identity', build: () => ['source-origin','source-id','source-remove','source-add'] as Action[], enters: ['subscription-input'] },
    { name: 'carried cache receipt', build: () => ['upgrade'] as Action[], enters: ['upgrade-cache'] },
  ],
};
async function seed() {
  await env.DB.prepare("INSERT INTO subscriptions(id,kind,origin,feed_url,created) VALUES('valid-sub','blyg','https://valid.example/','https://valid.example/feed.xml','2026-01-01')").run();
  for (let i=0;i<3;i++) {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO items(id,kind,status,created,updated,version,content_md) VALUES(?,'fragment','public',?,?,1,'body')").bind(`valid-own-${i}`,at(i*2),at(i*2)),
      env.DB.prepare("INSERT INTO versions(item_id,version,kind,content_md,content_html,content_hash,published_at,pinned,transclusions) VALUES(?,1,'fragment','body','<p>Body</p>','hash',?,?,?)").bind(`valid-own-${i}`,at(i*2),i===2?1:0,i===2?'[{"id":"valid-own-0","version":1}]':null),
      env.DB.prepare("INSERT INTO imported_items(subscription_id,remote_id,kind,state,version,created,updated,observed_at,changelog_json,transclusions_json) VALUES('valid-sub',?,'fragment','current',1,?,?,?, ?,?)").bind(`valid-import-${i}`,at(i*2+1),at(i*2+1),at(500),JSON.stringify([{version:1,at:at(i*2+1),pinned:i===2}]),i===2?'[{"id":"valid-import-0","version":1,"origin":"https://valid.example/"}]':null),
    ]);
  }
  // Two imported pins make the explicit-origin quote change a whole layer;
  // subsequent own arrivals make losing that quote observable in the order.
  await env.DB.prepare("UPDATE imported_items SET version=2,updated=?,changelog_json=? WHERE remote_id='valid-import-2'").bind(at(6),JSON.stringify([{version:1,at:at(5),pinned:true},{version:2,at:at(6),pinned:true}])).run();
  for(let i=3;i<7;i++)await env.DB.batch([
    env.DB.prepare("INSERT INTO items(id,kind,status,created,updated,version,content_md) VALUES(?,'fragment','public',?,?,1,'body')").bind(`valid-own-${i}`,at(8+i),at(8+i)),
    env.DB.prepare("INSERT INTO versions(item_id,version,kind,content_md,content_hash,published_at) VALUES(?,1,'fragment','body','hash',?)").bind(`valid-own-${i}`,at(8+i)),
  ]);
  await env.DB.prepare("INSERT INTO items(id,created,updated,content_md) VALUES('valid-draft','2026-01-01','2026-01-01','draft')").run();
}
async function keys(database=env.DB) { return (await readingData(database,{limit:100},'all',undefined,false,undefined,undefined,[],false,'pace-layered')).items.map(row=>row.key); }
const driveValidity = async (history: Action[], observe: (checkpoint: string, value: unknown) => void, keepMigrationStatement: (sql: string) => boolean = () => true) => {
    await withOracleStorage(async()=>{
      await seed(); await keys(); const counted=measureD1(env.DB);
      for (const [index,action] of history.entries()) {
        switch(action) {
          case 'own-publish': await env.DB.prepare("UPDATE items SET status='public',version=1 WHERE id='valid-draft'").run(); await env.DB.prepare("INSERT OR IGNORE INTO versions(item_id,version,kind,content_md,content_hash,published_at) VALUES('valid-draft',1,'fragment','draft','draft',?)").bind(at(30+index)).run(); break;
          case 'own-draft': await env.DB.prepare("UPDATE items SET content_md=? WHERE id='valid-own-0'").bind(`draft ${index}`).run(); break;
          case 'own-time': await env.DB.prepare("UPDATE versions SET published_at=? WHERE item_id='valid-own-0' AND version=1").bind(at(30+index)).run(); break;
          case 'own-pin': await env.DB.prepare("UPDATE versions SET pinned=1-pinned WHERE item_id='valid-own-0'").run(); break;
          case 'own-quotes': await env.DB.prepare("UPDATE versions SET transclusions=? WHERE item_id='valid-own-2'").bind(index%2?'[]':'[{"id":"valid-own-1","version":1}]').run(); break;
          case 'own-kind': await env.DB.prepare("UPDATE items SET kind=CASE kind WHEN 'thread' THEN 'fragment' ELSE 'thread' END WHERE id='valid-own-0'").run(); break;
          case 'own-delete-version': await env.DB.batch([env.DB.prepare("UPDATE items SET status='draft' WHERE id='valid-own-1'"),env.DB.prepare("DELETE FROM versions WHERE item_id='valid-own-1'")]); break;
          case 'own-add-version': await env.DB.batch([env.DB.prepare("INSERT OR IGNORE INTO versions(item_id,version,kind,content_md,content_hash,published_at) VALUES('valid-own-1',1,'fragment','restored','restored',?)").bind(at(30+index)),env.DB.prepare("UPDATE items SET status='public' WHERE id='valid-own-1'")]); break;
          case 'own-unpublish': await env.DB.prepare("UPDATE items SET status=CASE status WHEN 'public' THEN 'draft' ELSE 'public' END WHERE id='valid-own-0'").run(); break;
          case 'own-remove': await env.DB.prepare("DELETE FROM items WHERE id='valid-own-1'").run(); break;
          case 'import-time': await env.DB.prepare("UPDATE imported_items SET changelog_json=?,updated=? WHERE remote_id='valid-import-0'").bind(JSON.stringify([{version:1,at:at(30+index)}]),at(30+index)).run(); break;
          case 'import-pin': await env.DB.prepare("UPDATE imported_items SET changelog_json=? WHERE remote_id='valid-import-0'").bind(JSON.stringify([{version:1,at:at(1),pinned:index%2===0}])).run(); break;
          case 'import-quotes': await env.DB.prepare("UPDATE imported_items SET transclusions_json=? WHERE remote_id='valid-import-2'").bind(index%2?'[]':'[{"id":"valid-import-1","version":1}]').run(); break;
          case 'import-state': await env.DB.prepare("UPDATE imported_items SET state=CASE state WHEN 'current' THEN 'tombstone' ELSE 'current' END WHERE remote_id='valid-import-0'").run(); break;
          case 'import-remove': await env.DB.prepare("DELETE FROM imported_items WHERE remote_id='valid-import-1'").run(); break;
          case 'source-origin': await env.DB.prepare("UPDATE subscriptions SET origin=? WHERE id IN ('valid-sub','valid-renamed')").bind(`https://changed-${index}.example/`).run(); break;
          case 'source-id': await env.DB.prepare("UPDATE subscriptions SET id=CASE id WHEN 'valid-sub' THEN 'valid-renamed' ELSE 'valid-sub' END WHERE id IN ('valid-sub','valid-renamed')").run(); break;
          case 'source-remove': await env.DB.prepare("DELETE FROM subscriptions WHERE id IN ('valid-sub','valid-renamed')").run(); break;
          case 'source-add': await env.DB.prepare("INSERT OR IGNORE INTO subscriptions(id,kind,origin,feed_url,created) VALUES('valid-sub','blyg','https://valid.example/','https://valid.example/feed.xml','2026-01-01')").run(); break;
          case 'upgrade':
            // 0056 had no insertion trigger. Build while absent, then restore
            // the source without advancing inputs, exactly as that predecessor.
            await env.DB.prepare("INSERT OR IGNORE INTO subscriptions(id,kind,origin,feed_url,created) VALUES('valid-sub','blyg','https://valid.example/','https://valid.example/feed.xml','2026-01-01')").run();
            await env.DB.prepare('DROP TRIGGER reader_order_subscriptions_insert').run();
            await env.DB.prepare("DELETE FROM subscriptions WHERE id='valid-sub'").run();
            await ensureReaderOrder(env.DB);
            await env.DB.prepare("INSERT INTO subscriptions(id,kind,origin,feed_url,created) VALUES('valid-sub','blyg','https://valid.example/','https://valid.example/feed.xml','2026-01-01')").run();
            await applyReaderWorkMigration(env.DB,keepMigrationStatement);
            break;
        }
        counted.reset(); const cached = await keys(counted.db), work={...counted.totals}, fresh = await loadReaderHistory(env.DB);
        const visible = new Set(fresh.items.filter(item=>!item.withdrawn).map(item=>item.id));
        const reference = readerPositions(fresh.items).filter(key=>visible.has(key)).map(key=>{const identity=fresh.identities.get(key)!;return identity.source==='own'?`own:${identity.id}`:`imported:${JSON.stringify([identity.sub,identity.id])}`;});
        observe('identities',{cached,reference,work});
      }
    }); observe('complete',true);
  };
oracleProperty({
  id: 'reader-cache-validity', owns: ['src/feeds/reader-order-cache.ts#ensureReaderOrder','src/reading-data.ts#readingData'],
  law: { statement: 'For every source history, caching preserves the uncached ordered identities without derived writes for unchanged working-copy inputs.', authority: 'docs/pace-layered-feed.md; Kyle Mathews (GitHub KyleAMathews), #170 correctness with bounded work, 2026-11-22.', limits: 'Metamorphic cache law trusts the uncached history loader and ranker; generated source edits over ten entries, local D1.' },
  histories, model: history => history.map(action=>({maxWritten:action==='own-draft'?0:1000})),
  reached: history => [...new Set(history.map(action=>action==='upgrade'?'upgrade-cache':action.startsWith('own-')?'own-input':action.startsWith('import-')?'imported-input':'subscription-input'))],
  driver: driveValidity,
  check: (_history,trace,expected) => {
    const events=trace.filter(entry=>entry.checkpoint==='identities');
    for(const [index,entry] of events.entries()){const {cached,reference,work}=entry.value as {cached:unknown;reference:unknown;work:{written:number}};const mismatch=differs('identities',law,cached,reference)??differs('identities',law,work.written<=expected[index].maxWritten,true);if(mismatch)return mismatch;}
    return trace.some(entry=>entry.checkpoint==='complete')?differs('complete',law,events.length,expected.length)??pass:pass;
  },
  calibrations:[{name:'upgrade retains old cache receipt',law,history:{constructed:'carried cache receipt'},driver:async(plan,observe)=>driveValidity(plan,observe,sql=>!/UPDATE reading_order_state SET generation = ''/.test(sql))},{name:'stale cached identity',law,history:{constructed:'own publishing'},corrupt:trace=>trace.map(entry=>entry.checkpoint==='identities'?{...entry,value:{...(entry.value as object),cached:['stale']}}:entry)}],
});

const cursorLaw='ranking changes expire continuations';
const drivePin = async ({count,upgrade}: {count: number; upgrade: boolean}, observe: (checkpoint: string, value: unknown) => void, keepMigrationStatement: (sql: string) => boolean = () => true) => {
    await withOracleStorage(async()=>{
      for(let i=0;i<count;i++)await env.DB.batch([
        env.DB.prepare("INSERT INTO items(id,kind,status,created,updated,version,content_md) VALUES(?,'fragment','public',?,?,1,'body')").bind(`pin-${i}`,at(i),at(i)),
        env.DB.prepare("INSERT INTO versions(item_id,version,kind,content_md,content_hash,published_at) VALUES(?,1,'fragment','body','hash',?)").bind(`pin-${i}`,at(i)),
      ]);
      if(upgrade)await installPreviousReaderTrigger(env.DB,'change_versions_update');
      const before=await readingData(env.DB,{limit:count-1},'all',undefined,false,undefined,undefined,[],false,'pace-layered');
      await env.DB.prepare("UPDATE versions SET pinned=1 WHERE item_id='pin-0'").run();
      if(upgrade)await applyReaderWorkMigration(env.DB,keepMigrationStatement);
      try {const result=await readingData(env.DB,{limit:count-1,cursor:before.page.nextCursor!},'all',undefined,false,undefined,undefined,[],false,'pace-layered');observe('continuation',{status:200,ids:result.items.map(item=>item.key)});}
      catch(error){observe('continuation',{status:error instanceof Error&&'code'in error&&error.code==='cursor-expired'?409:500});}
    });
  };
oracleProperty({
  id:'reader-pin-cursor',owns:['src/reading-data.ts#readingData','src/cursor-page.ts#cursorPage'],
  law:{statement:'A continuation acquired before a rank-changing own pin returns cursor-expired.',authority:'docs/api.md, generation-bound cursors expire on relevant mutations.',limits:'Local D1 own unpinned fragments, page ending immediately above the oldest item; no change to cursor format.'},
  histories:{arbitrary:fc.record({count:fc.integer({min:4,max:8}),upgrade:fc.boolean()}),runs:25,fixedSeeds:[1702026],states:['pin-crosses-boundary','upgrade-cursor'],constructed:[{name:'pin crosses page',build:()=>({count:4,upgrade:false}),enters:['pin-crosses-boundary']},{name:'carried pin cursor',build:()=>({count:4,upgrade:true}),enters:['upgrade-cursor']}]},
  model:()=>409,reached:plan=>['pin-crosses-boundary',...(plan.upgrade?['upgrade-cursor']:[])],
  driver:drivePin,
  check:(_count,trace,expected)=>differs('continuation',cursorLaw,trace.find(entry=>entry.checkpoint==='continuation')?.value,{status:expected})??pass,
  calibrations:[{name:'upgrade retains old Reading cursor',law:cursorLaw,history:{constructed:'carried pin cursor'},driver:async(plan,observe)=>drivePin(plan,observe,sql=>!/UPDATE change_state SET reading=reading\+1 WHERE id=1/.test(sql))},{name:'accept pin-invalidated continuation',law:cursorLaw,history:{constructed:'pin crosses page'},corrupt:trace=>trace.map(entry=>entry.checkpoint==='continuation'?{...entry,value:{status:200}}:entry)}],
});

/**
 * The cache-validity relation is unchanged under overlapping publishers. The
 * source mutation finishes before the observed read begins, so its page owes
 * the new order. Only derived publication overlaps that read. The loader and
 * ranker remain the same explicit trusted base as the serial relation above.
 *
 * A deferred publisher, a current publisher and an optional warm reader are
 * driver participants, not new product states. SQL text identifies native D1
 * scheduling seams only; it supplies neither a result nor a work verdict.
 * The model remains the equality relation, rather than replaying the cache's
 * counter or generation transitions. A receipt that claims current inputs
 * must describe the fresh positions; a stale receipt is allowed while a build
 * is pending, but cannot excuse a wrong completed page.
 *
 * Grammar: 4–8 own entries, widths 1..count-1, an older backfill arrival or an
 * order-changing pin, four schedules, and first or continuation pages. A
 * continuation is obtained after the source change, so its generation is
 * current; clearing only the derived receipt then forces cold preparation
 * without invalidating that cursor. Removing warm reads loses the
 * matching-receipt shortcut; removing cold reads loses the rebuilding caller;
 * reversing publication and serial execution keep passing neighbours. A
 * newest backfill timestamp can accidentally agree with the missing-position
 * fallback, so the arrival is legally older than the latest held item. Empty
 * or nonpositive-width histories are outside this grammar. All waits use
 * controlled signals, and every started request settles before fixture cleanup.
 * The delayed caller's response is checked after its retry settles, using the
 * post-change reference; the serial neighbour keeps its pre-change reference.
 * Final positions and receipt are also checked after every publisher settles,
 * so an old caller cannot repair the observer's page and then leave bad state.
 */
const publicationSchedules = ['cold-stale-last', 'warm-stale-last', 'old-first', 'serial'] as const;
type PublicationPlan = { count: number; limit: number; change: 'arrival' | 'pin'; schedule: typeof publicationSchedules[number]; continuation: boolean };
type ReadOutcome = { ok: true; keys: string[]; hasContinuation: boolean } | { ok: false; error: { name: string; message: string } };
type ReferencePage = { reference: string[]; hasContinuation: boolean };
function deferredSignal() {
  let resolve!: () => void;
  const promise = new Promise<void>(complete => { resolve = complete; });
  return { promise, resolve };
}
function publicationGate() {
  const entered = deferredSignal(), released = deferredSignal();
  let used = false;
  return {
    entered: entered.promise,
    release: released.resolve,
    async wait() {
      if (used) return;
      used = true;
      entered.resolve();
      await released.promise;
    },
  };
}
function scheduledReaderDb(database: D1Database, beforePublish?: () => Promise<void>, beforeSelect?: () => Promise<void>): D1Database {
  const native = new WeakMap<D1PreparedStatement, D1PreparedStatement>();
  const sqlByStatement = new WeakMap<D1PreparedStatement, string>();
  function wrap(statement: D1PreparedStatement, sql: string): D1PreparedStatement {
    const proxy = new Proxy(statement, { get(target, key) {
      if (key === 'bind') return (...values: unknown[]) => wrap(target.bind(...values), sql);
      if (key === 'all' || key === 'first' || key === 'run' || key === 'raw') return async (...values: unknown[]) => {
        if (sql.includes('cursor_source')) await beforeSelect?.();
        return Reflect.apply(Reflect.get(target, key), target, values);
      };
      const value = Reflect.get(target, key);
      return typeof value === 'function' ? value.bind(target) : value;
    } });
    native.set(proxy, statement);
    sqlByStatement.set(proxy, sql);
    return proxy;
  }
  return new Proxy(database, { get(target, key) {
    if (key === 'prepare') return (sql: string) => wrap(target.prepare(sql), sql);
    if (key === 'batch') return async (statements: D1PreparedStatement[]) => {
      if (statements.some(statement => sqlByStatement.get(statement)?.includes('DELETE FROM reading_order'))) await beforePublish?.();
      return target.batch(statements.map(statement => native.get(statement) ?? statement));
    };
    const value = Reflect.get(target, key);
    return typeof value === 'function' ? value.bind(target) : value;
  } });
}
async function freshReadingKeys() {
  const fresh = await loadReaderHistory(env.DB);
  const visible = new Set(fresh.items.filter(item => !item.withdrawn).map(item => item.id));
  return readerPositions(fresh.items).filter(key => visible.has(key)).map(key => {
    const identity = fresh.identities.get(key)!;
    return identity.source === 'own' ? `own:${identity.id}` : `imported:${JSON.stringify([identity.sub, identity.id])}`;
  });
}
const publicationLaw = 'cached ranking preserves fresh identities';
async function drivePublication(plan: PublicationPlan, observe: (checkpoint: string, value: unknown) => void) {
  await withOracleStorage(async () => {
    const oldPublish = publicationGate(), oldSelect = publicationGate(), observerSelect = publicationGate();
    const gates = [oldPublish, oldSelect, observerSelect];
    const tasks: Promise<ReadOutcome>[] = [];
    let serialOldReference: ReferencePage | null = null;
    const read = (database: D1Database, cursor?: string, captureCursor?: (value: string | null) => void) => {
      const task = readingData(database, { limit: plan.limit, cursor }, 'all', undefined, false, undefined, undefined, [], false, 'pace-layered')
        .then(result => {
          captureCursor?.(result.page.nextCursor);
          return { ok: true as const, keys: result.items.map(item => item.key), hasContinuation: result.page.nextCursor !== null };
        }, error => ({ ok: false as const, error: { name: error instanceof Error ? error.name : 'Thrown', message: error instanceof Error ? error.message : String(error) } }));
      tasks.push(task);
      return task;
    };
    // A request settling before its scheduling seam is data, not a hung driver
    // or an unhandled production exception. The check reports that observation.
    const enter = async (gate: ReturnType<typeof publicationGate>, task: Promise<ReadOutcome>) => {
      const entered = await Promise.race([gate.entered.then(() => true), task.then(() => false)]);
      if (!entered) observe('schedule-error', { message: 'request settled before required D1 seam', result: await task });
      return entered;
    };
    const recordPage = async (task: Promise<ReadOutcome>, offset = 0, captureReference?: (value: ReferencePage) => void) => {
      const result = await task;
      const reference = await freshReadingKeys();
      const expected = { reference: reference.slice(offset, offset + plan.limit), hasContinuation: reference.length > offset + plan.limit };
      observe('page', { result, ...expected });
      captureReference?.(expected);
      return result.ok;
    };
    const recordCache = async (checkpoint: string) => {
      const state = await env.DB.prepare('SELECT c.epoch,r.inputs,r.generation FROM change_state c JOIN reading_order_state r ON r.id=c.id WHERE c.id=1').first<{ epoch: string; inputs: number; generation: string }>();
      const positions = (await env.DB.prepare('SELECT source,sub,id FROM reading_order ORDER BY position').all<{ source: string; sub: string; id: string }>()).results
        .map(identity => identity.source === 'own' ? `own:${identity.id}` : `imported:${JSON.stringify([identity.sub, identity.id])}`);
      // Opaque epochs differ between disposable databases. Keep their equality
      // relation without exposing the token in the deterministic trace.
      observe(checkpoint, { hasState: state !== null, current: state !== null && state.generation === JSON.stringify([state.epoch, state.inputs]), positions, reference: await freshReadingKeys() });
    };
    try {
      await env.DB.prepare("INSERT INTO subscriptions(id,kind,origin,feed_url,created) VALUES('publication-sub','blyg','https://publication.example/','https://publication.example/feed.xml','2026-01-01')").run();
      for (let index = 0; index < plan.count; index++) await env.DB.batch([
        env.DB.prepare("INSERT INTO items(id,kind,status,created,updated,version,content_md) VALUES(?,'fragment','public',?,?,1,'body')").bind(`publication-${index}`, at(index), at(index)),
        env.DB.prepare("INSERT INTO versions(item_id,version,kind,content_md,content_hash,published_at) VALUES(?,1,'fragment','body','hash',?)").bind(`publication-${index}`, at(index)),
      ]);
      const old = read(plan.schedule === 'serial' ? env.DB : scheduledReaderDb(env.DB, oldPublish.wait, oldSelect.wait));
      if (plan.schedule === 'serial') {
        if (!await recordPage(old, 0, reference => { serialOldReference = reference; })) return;
      } else if (!await enter(oldPublish, old)) return;
      if (plan.change === 'pin') await env.DB.prepare("UPDATE versions SET pinned=1 WHERE item_id='publication-0'").run();
      else await env.DB.prepare("INSERT INTO imported_items(subscription_id,remote_id,kind,state,version,created,updated,observed_at,changelog_json) VALUES('publication-sub','publication-arrival','fragment','current',1,?,?,?,?)")
        .bind(at(plan.count / 2), at(plan.count / 2), at(plan.count + 10), JSON.stringify([{ version: 1, at: at(plan.count / 2) }])).run();
      if (plan.schedule === 'old-first') {
        oldPublish.release();
        if (!await enter(oldSelect, old)) return;
      }
      let continuation: string | null = null;
      if (plan.continuation) {
        if (!await recordPage(read(env.DB, undefined, value => { continuation = value; }))) return;
        if (!continuation) {
          observe('schedule-error', { message: 'current first page omitted required continuation' });
          return;
        }
        if (plan.schedule === 'cold-stale-last') await env.DB.prepare("UPDATE reading_order_state SET generation='' WHERE id=1").run();
      } else if (plan.schedule === 'warm-stale-last' && !await recordPage(read(env.DB))) return;
      const observer = read(scheduledReaderDb(env.DB, undefined, observerSelect.wait), continuation ?? undefined);
      if (!await enter(observerSelect, observer)) return;
      if (plan.schedule === 'cold-stale-last' || plan.schedule === 'warm-stale-last') {
        oldPublish.release();
        if (!await enter(oldSelect, old)) return;
      }
      await recordCache('cache');
      observerSelect.release();
      await recordPage(observer, plan.continuation ? plan.limit : 0);
      observe('reach', plan.schedule);
      observe('reach', `${plan.change}-input`);
      observe('reach', plan.continuation ? 'continuation' : 'first-page');
    } catch (error) {
      observe('production-error', { name: error instanceof Error ? error.name : 'Thrown', message: error instanceof Error ? error.message : String(error) });
    } finally {
      gates.forEach(gate => gate.release());
      const settled = await Promise.all(tasks);
      // The old response can settle after the observer, so record its own owed
      // page rather than accepting a successful but stale response. Serial old
      // reads completed before mutation and retain their earlier reference.
      try {
        const reference = await freshReadingKeys();
        observe('old-reference', serialOldReference ?? { reference: reference.slice(0, plan.limit), hasContinuation: reference.length > plan.limit });
        await recordCache('final-cache');
      } catch (error) {
        observe('production-error', { name: error instanceof Error ? error.name : 'Thrown', message: error instanceof Error ? error.message : String(error) });
      }
      observe('settled', settled);
    }
  });
}
oracleProperty({
  id: 'reader-cache-publication',
  owns: ['src/feeds/reader-order-cache.ts#ensureReaderOrder', 'src/reading-data.ts#readingData', 'src/cursor-page.ts#cursorPage'],
  law: {
    statement: 'For every source history, overlapping cache publication preserves the fresh ordered identities of each completed page and every position receipt that claims current inputs.',
    authority: 'docs/pace-layered-feed.md; Kyle Mathews (GitHub KyleAMathews), #170 correctness with bounded work, 2026-11-22.',
    limits: 'Four controlled native local D1 schedules with 4–8 own items, an arrival or pin, first/continuation pages and at most three reading requests; the uncached history loader and ranker are a trusted base. No replica or ranker-formula claim.',
  },
  histories: {
    arbitrary: fc.record({ count: fc.integer({ min: 4, max: 8 }), limit: fc.integer({ min: 1, max: 7 }), change: fc.constantFrom('arrival' as const, 'pin' as const), schedule: fc.constantFrom(...publicationSchedules), continuation: fc.boolean() }),
    runs: 25, fixedSeeds: [1702026],
    states: [...publicationSchedules, 'arrival-input', 'pin-input', 'first-page', 'continuation'],
    constructed: [
      ...publicationSchedules.map(schedule => ({ name: schedule, build: (plan: PublicationPlan) => ({ ...plan, schedule, continuation: false }), enters: [schedule, 'first-page'] })),
      ...(['arrival', 'pin'] as const).map(change => ({ name: `${change}-input`, build: (plan: PublicationPlan) => ({ ...plan, change }), enters: [`${change}-input`] })),
      ...(['cold-stale-last', 'warm-stale-last'] as const).map(schedule => ({ name: `${schedule}-pin-crosses-page`, build: (plan: PublicationPlan) => ({ ...plan, change: 'pin' as const, limit: plan.count - 1, schedule }), enters: [schedule, 'pin-input'] })),
      { name: 'warm continuation crosses pinned tail', build: (plan: PublicationPlan) => ({ ...plan, limit: plan.count - 1, change: 'pin' as const, schedule: 'warm-stale-last' as const, continuation: true }), enters: ['warm-stale-last', 'pin-input', 'continuation'] },
      { name: 'cold continuation crosses backfill', build: (plan: PublicationPlan) => ({ ...plan, limit: plan.count - 1, change: 'arrival' as const, schedule: 'cold-stale-last' as const, continuation: true }), enters: ['cold-stale-last', 'arrival-input', 'continuation'] },
    ],
    fixed: [
      { name: 'pin preserves first-row neighbour', history: { count: 4, limit: 1, change: 'pin', schedule: 'cold-stale-last', continuation: false } },
      { name: 'delayed backfill build crosses first row', history: { count: 4, limit: 1, change: 'arrival', schedule: 'cold-stale-last', continuation: false } },
      { name: 'delayed pin build crosses wider page', history: { count: 4, limit: 3, change: 'pin', schedule: 'cold-stale-last', continuation: false } },
    ],
  },
  resolve: history => ({ ...history, count: Math.max(history.count, history.limit + 1) }),
  model: () => true,
  driver: drivePublication,
  check: (_plan, trace) => {
    for (const entry of trace) {
      if (entry.checkpoint === 'schedule-error' || entry.checkpoint === 'production-error') return differs(entry.checkpoint, publicationLaw, entry.value, null)!;
      if (entry.checkpoint === 'cache' || entry.checkpoint === 'final-cache') {
        const { hasState, current: receiptCurrent, positions, reference } = entry.value as { hasState: boolean; current: boolean; positions: string[]; reference: string[] };
        const mismatch = differs('cache-state', publicationLaw, hasState, true);
        if (mismatch) return mismatch;
        if (entry.checkpoint === 'final-cache') {
          const current = differs('final-cache-receipt', publicationLaw, receiptCurrent, true);
          if (current) return current;
        }
        if (receiptCurrent || entry.checkpoint === 'final-cache') {
          const current = differs(entry.checkpoint, publicationLaw, positions, reference);
          if (current) return current;
        }
      }
      if (entry.checkpoint === 'page') {
        const { result, reference, hasContinuation } = entry.value as { result: ReadOutcome; reference: string[]; hasContinuation: boolean };
        const mismatch = differs('page', publicationLaw, result, { ok: true, keys: reference, hasContinuation });
        if (mismatch) return mismatch;
      }
      if (entry.checkpoint === 'settled') {
        const settled = entry.value as ReadOutcome[];
        const mismatch = differs('settled', publicationLaw, settled.every(result => result.ok), true);
        if (mismatch) return mismatch;
        const reference = trace.find(observation => observation.checkpoint === 'old-reference')?.value as ReferencePage | undefined;
        if (!reference) return differs('old-response-reference', publicationLaw, reference ?? null, 'a recorded owed page')!;
        const old = differs('old-response', publicationLaw, settled[0], { ok: true, keys: reference.reference, hasContinuation: reference.hasContinuation });
        if (old) return old;
      }
    }
    return differs('completed checkpoints', publicationLaw, ['cache', 'page', 'old-reference', 'final-cache', 'settled'].every(checkpoint => trace.some(entry => entry.checkpoint === checkpoint)), true) ?? pass;
  },
  calibrations: [
    { name: 'completed page uses stale cache identities', law: publicationLaw, history: { constructed: 'old-first' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'page' ? { ...entry, value: { ...(entry.value as object), result: { ok: true, keys: ['stale'] } } } : entry) },
    { name: 'old caller returns stale identities', law: publicationLaw, history: { constructed: 'cold-stale-last-pin-crosses-page' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'settled' ? { ...entry, value: (entry.value as ReadOutcome[]).map((result, index) => index === 0 && result.ok ? { ...result, keys: ['stale-old-caller'] } : result) } : entry) },
    { name: 'old caller returns wrong continuation presence', law: publicationLaw, history: { constructed: 'cold-stale-last-pin-crosses-page' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'settled' ? { ...entry, value: (entry.value as ReadOutcome[]).map((result, index) => index === 0 && result.ok ? { ...result, hasContinuation: !result.hasContinuation } : result) } : entry) },
    { name: 'old retry leaves stale final positions', law: publicationLaw, history: { constructed: 'cold-stale-last-pin-crosses-page' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'final-cache' ? { ...entry, value: { ...(entry.value as object), positions: ['stale-final-position'] } } : entry) },
    { name: 'old retry leaves stale final receipt', law: publicationLaw, history: { constructed: 'cold-stale-last-pin-crosses-page' }, corrupt: trace => trace.map(entry => entry.checkpoint === 'final-cache' ? { ...entry, value: { ...(entry.value as object), current: false } } : entry) },
  ],
});
