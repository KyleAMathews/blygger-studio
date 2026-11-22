/**
 * Imported writes invalidate hoppers only when they change a hopper's returned
 * data. This oracle owns the imported-item dependency of `readChanges` and the
 * membership HTTP receiver, checked after each source or membership write.
 *
 * GET /api/hoppers/h/memberships // → a member's held item, or null when absent
 * import(unrelatedItem)         // → unchanged hopper revision
 * repair(member.contentHtml)    // → changed member and hopper revision
 *
 * Why should an uncollected import make every hopper look changed? The member
 * identity decides whether an imported row is a dependency. Its public fields
 * decide whether an update changes that dependency. History and Background
 * facts are absent from the membership resource, even when the item is held.
 *
 * For every imported-write history, hoppers advances exactly when membership
 * or returned imported data changes. Decision by Kyle Mathews (GitHub
 * KyleAMathews), 2026-11-22, #170; docs/d1-polling-cache-design.md P2/R1 supplies
 * the positive dependency obligation. The model projects only a tiny source
 * record and optional membership; it never reads trigger definitions.
 *
 * Histories interleave membership, deletion/reinsertion, body repair, no-op and
 * private metadata writes. The driver reads real HTTP memberships and native
 * D1 revisions. A null item behind a dangling membership remains a dependency:
 * importing it changes what the membership returns. Limits: local D1, one edited
 * identity plus an independently collected neighbour, body as the representative projected field. Rich resource
 * rendering and all other change domains have their existing oracles.
 */
import { env } from 'cloudflare:test';
import fc from 'fast-check';
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { readChanges } from '../src/changes.ts';
import { apiJson, login } from './helpers.ts';
import { withOracleStorage } from './oracle-storage.ts';

const actions = ['body', 'history', 'background', 'links', 'delete', 'insert', 'join', 'leave', 'noop'] as const;
type Action = typeof actions[number];
type Plan = { member: boolean; other: 'none' | 'same-sub' | 'other-sub'; actions: Action[] };
const law = 'invalidation follows returned dependencies';
const histories = {
  arbitrary: fc.record({ member: fc.boolean(), other: fc.constantFrom('none' as const,'same-sub' as const,'other-sub' as const), actions: fc.array(fc.constantFrom(...actions), { minLength: 0, maxLength: 12 }) }),
  runs: 25, fixedSeeds: [1702026], states: ['member', 'uncollected', 'private-metadata', 'changed-body', 'dangling', 'occupied-unrelated'],
  constructed: [
    { name: 'dependency lifecycle', build: () => ({ member: false, other: 'none' as const, actions: ['body', 'join', 'body', 'history', 'background', 'links', 'delete', 'insert', 'leave', 'body'] as Action[] }), enters: ['member', 'uncollected', 'private-metadata', 'changed-body', 'dangling'] },
    {name:'same source unrelated member',build:()=>({member:false,other:'same-sub' as const,actions:['body','history','delete','insert'] as Action[]}),enters:['occupied-unrelated']},
    {name:'other source unrelated member',build:()=>({member:false,other:'other-sub' as const,actions:['body','background','delete','insert'] as Action[]}),enters:['occupied-unrelated']},
  ],
};
// Membership and source existence are separate: delete/insert distinguishes
// them. Body is retained across private writes and reset by reinsertion.
function model(plan: Plan) {
  let member = plan.member, html: string | null = '<p>Initial</p>';
  return plan.actions.map((action, index) => {
    const before = JSON.stringify([...(member ? [html] : []),...(plan.other==='none'?[]:['<p>Other</p>'])]);
    switch (action) {
      case 'body': if (html !== null) html = `<p>Body ${index}</p>`; break;
      case 'delete': html = null; break;
      case 'insert': if (html === null) html = '<p>Initial</p>'; break;
      case 'join': member = true; break;
      case 'leave': member = false; break;
    }
    const rows = [...(member ? [html] : []),...(plan.other==='none'?[]:['<p>Other</p>'])];
    return { rows, advances: JSON.stringify(rows) !== before };
  });
}
// Native trigger mutants keep the same source writes and HTTP receiver. They
// exercise SQL behavior, which the TypeScript mutation generator cannot parse.
async function mutateHopperDependency(mode: 'always' | 'never' | 'same-sub' | 'remote-only') {
  const triggers=(await env.DB.prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger' AND name IN ('change_imported_items_insert','change_imported_items_update','change_imported_items_delete')").all<{name:string;sql:string}>()).results;
  for(const trigger of triggers){
    let sql=trigger.sql;
    const side=trigger.name.endsWith('_delete')?'OLD':'NEW';
    if(mode==='same-sub'||mode==='remote-only')sql=sql.replace(/EXISTS\(SELECT 1 FROM hopper_items WHERE [\s\S]*?\) THEN 1 ELSE 0 END\)/,`EXISTS(SELECT 1 FROM hopper_items WHERE ${mode==='same-sub'?'subscription_id':'remote_id'}=${side}.${mode==='same-sub'?'subscription_id':'remote_id'}) THEN 1 ELSE 0 END)`);
    else sql=sql.replace(/hoppers=hoppers\+\(CASE[\s\S]*?END\)/,'hoppers=hoppers+('+ (mode==='always'?'1':'0') +')');
    if(sql===trigger.sql)throw new Error('Hopper mutation did not apply');
    await env.DB.batch([env.DB.prepare('DROP TRIGGER '+trigger.name),env.DB.prepare(sql)]);
  }
}
const drive = async (plan: Plan, observe: (checkpoint: string, value: unknown) => void) => {
    await withOracleStorage(async () => {
      const cookie = await login();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO subscriptions(id,kind,origin,feed_url,created) VALUES('dep-sub','blyg','https://dependency.example/','https://dependency.example/feed.xml','2026-01-01')"),
        env.DB.prepare("INSERT INTO hoppers(id,name,created) VALUES('dep-hopper','Dependencies','2026-01-01')"),
      ]);
      async function insert() { await env.DB.prepare("INSERT OR IGNORE INTO imported_items(subscription_id,remote_id,kind,state,version,content_html,observed_at) VALUES('dep-sub','dep-item','fragment','current',1,'<p>Initial</p>','2026-01-01T00:00:00Z')").run(); }
      async function join() { await env.DB.prepare("INSERT OR IGNORE INTO hopper_items(hopper_id,subscription_id,remote_id,added_at) VALUES('dep-hopper','dep-sub','dep-item','2026-01-01')").run(); }
      await insert(); if (plan.member) await join();
      if(plan.other!=='none'){
        await env.DB.prepare("INSERT INTO subscriptions(id,kind,origin,feed_url,created) VALUES('dep-other-sub','blyg','https://other.example/','https://other.example/feed.xml','2026-01-01')").run();
        const otherSub=plan.other==='same-sub'?'dep-sub':'dep-other-sub',otherId=plan.other==='same-sub'?'dep-other':'dep-item';
        await env.DB.batch([
          env.DB.prepare("INSERT INTO imported_items(subscription_id,remote_id,kind,state,version,content_html,observed_at) VALUES(?,?,'fragment','current',1,'<p>Other</p>','2025-01-01T00:00:00Z')").bind(otherSub,otherId),
          env.DB.prepare("INSERT INTO hopper_items(hopper_id,subscription_id,remote_id,added_at) VALUES('dep-hopper',?,?,'2025-01-01')").bind(otherSub,otherId),
        ]);
      }
      for (const [index, action] of plan.actions.entries()) {
        const before = await readChanges(env.DB);
        switch (action) {
          case 'body': await env.DB.prepare("UPDATE imported_items SET content_html=? WHERE subscription_id='dep-sub' AND remote_id='dep-item'").bind(`<p>Body ${index}</p>`).run(); break;
          case 'history': await env.DB.prepare("UPDATE imported_items SET changelog_json=?,maintenance_json=? WHERE subscription_id='dep-sub' AND remote_id='dep-item'").bind(JSON.stringify([{version:index+1,at:'2026-01-01'}]),JSON.stringify([index+1])).run(); break;
          case 'background': await env.DB.prepare("UPDATE imported_items SET bg_reasons=?,bg_detail=? WHERE subscription_id='dep-sub' AND remote_id='dep-item'").bind('["maintenance"]',JSON.stringify({index})).run(); break;
          case 'links': await env.DB.prepare("UPDATE imported_items SET links_json=? WHERE subscription_id='dep-sub' AND remote_id='dep-item'").bind(JSON.stringify([`link-${index}`])).run(); break;
          case 'delete': await env.DB.prepare("DELETE FROM imported_items WHERE subscription_id='dep-sub' AND remote_id='dep-item'").run(); break;
          case 'insert': await insert(); break;
          case 'join': await join(); break;
          case 'leave': await env.DB.prepare("DELETE FROM hopper_items WHERE hopper_id='dep-hopper' AND subscription_id='dep-sub' AND remote_id='dep-item'").run(); break;
          case 'noop': await env.DB.prepare("UPDATE imported_items SET content_html=content_html WHERE subscription_id='dep-sub' AND remote_id='dep-item'").run(); break;
        }
        const after = await readChanges(env.DB);
        const response = await apiJson(cookie,'GET','/blyg/api/hoppers/dep-hopper/memberships');
        const result = response.json as { items?: { item: { contentHtml: string } | null }[] };
        observe('dependency', { status: response.status, rows: result.items?.map(row => row.item?.contentHtml ?? null), advances: after.domains.hoppers > before.domains.hoppers });
      }
    }); observe('complete',true);
  };
oracleProperty({
  id: 'hopper-import-dependencies', owns: ['src/changes.ts#readChanges'],
  law: { statement: 'For every imported-write history, hoppers advances exactly when membership or returned imported data changes.', authority: 'Kyle Mathews (GitHub KyleAMathews), #170 approved dependency rule, 2026-11-22; docs/d1-polling-cache-design.md P2/R1.', limits: 'Local D1 and HTTP memberships, two identities and source-sharing axis, representative contentHtml field and private metadata; other domains and full resource projection have separate owners.' },
  histories, model,
  reached: (plan) => {
    const results = model(plan), states = new Set<string>([plan.member ? 'member' : 'uncollected',...(plan.other!=='none'&&!plan.member?['occupied-unrelated']:[])]);
    results.forEach((result, index) => {
      if (result.rows.length) states.add('member'); else states.add('uncollected');
      if (result.rows.includes(null)) states.add('dangling');
      if (['history', 'background', 'links'].includes(plan.actions[index])) states.add('private-metadata');
      if (plan.actions[index] === 'body' && result.advances) states.add('changed-body');
    }); return [...states];
  },
  driver: drive,
  check: (_plan, trace, expected) => {
    const actual = trace.filter(entry => entry.checkpoint === 'dependency');
    for (const [index, entry] of actual.entries()) { const mismatch = differs('dependency',law,entry.value,{status:200,...expected[index]}); if (mismatch) return mismatch; }
    return trace.some(entry => entry.checkpoint === 'complete') ? differs('complete',law,actual.length,expected.length) ?? pass : pass;
  },
  calibrations: [
    {name:'native trigger compares only subscription',law,history:{constructed:'same source unrelated member'},driver:async(plan,observe)=>withOracleStorage(async()=>{await mutateHopperDependency('same-sub');await drive(plan,observe);})},
    {name:'native trigger compares only remote ID',law,history:{constructed:'other source unrelated member'},driver:async(plan,observe)=>withOracleStorage(async()=>{await mutateHopperDependency('remote-only');await drive(plan,observe);})},
    {name:'unconditional native hopper trigger',law,history:{constructed:'dependency lifecycle'},driver:async(plan,observe)=>withOracleStorage(async()=>{await mutateHopperDependency('always');await drive(plan,observe);})},
    {name:'native trigger misses member body',law,history:{constructed:'dependency lifecycle'},driver:async(plan,observe)=>withOracleStorage(async()=>{await mutateHopperDependency('never');await drive(plan,observe);})},
    { name: 'unrelated import invalidates hoppers', law, history: { constructed: 'dependency lifecycle' }, corrupt: trace => { let first=true; return trace.map(entry => { if(entry.checkpoint!=='dependency'||!first)return entry;first=false;return {...entry,value:{...(entry.value as object),advances:true}}; }); } }],
});
