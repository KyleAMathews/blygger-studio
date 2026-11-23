/**
 * Reading maintains derived positions within a work budget while preserving the
 * collection's ordered values and generation-bound continuations. A current
 * cache needs page-sized materialization and no writes; a rejected continuation
 * needs at most one revision lookup and no writes. A cold or changed history
 * may materialize and rewrite a linear amount of source data.
 *
 * readingData(db, { limit: 1 }, 'all', ...) // → one correctly ordered entry
 * markRead(...); readingData(...)          // → updated read state, bounded work
 * readingData(..., { cursor: expired })    // → cursor-expired, validation only
 *
 * Why should marking one entry unread rewrite hundreds of unchanged positions?
 * The model keeps source entries, their order, placements, read marks and a
 * cursor's validity. A separate dirty flag describes whether ordering inputs
 * changed, independently of production counters or cache representation.
 *
 * For every history, derived-data maintenance is bounded by the requested page
 * when its inputs are unchanged or the request is rejected, and by source size
 * when inputs change. Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-22,
 * issue #170 assessment and approved work-oracle plan. Ordered arrivals and
 * single-place revision climbs come from docs/pace-layered-feed.md; cursor
 * expiry comes from docs/api.md. The concrete budgets below count real D1
 * result rows, writes and calls, never elapsed time or JavaScript work ratios.
 * Read marks preserve continuations (Venkat, GitHub vgururao, 2026-11-22,
 * issue #171): marking or clearing while scanning changes the returned state
 * without changing the collection's membership or order.
 *
 * Histories vary source size, page width and sequences of related/unrelated
 * changes. The driver calls the real reading entry point and real importer,
 * read-state and owner API writes. The pure array model predicts returned
 * identities, content and read marks before considering the cost budget. The
 * complete derived position sequence is observed separately, outside the work
 * meter, so truncating a build beyond the requested page cannot go unnoticed.
 * Limits: local D1; unpinned fragment histories, no maintenance revisions or
 * burst folding. Existing reader-order tests own richer replay examples.
 * Page-selection SQL can scan source rows; the constant hot budget concerns
 * rows materialized in the Worker and writes, not all D1 index/page reads.
 */
import { measureD1 } from '../test-oracles/d1-work.ts';
import { env } from 'cloudflare:test';
import fc from 'fast-check';
import { oracleProperty, differs, pass, violation } from '@tanstack/oracles';
import { readingData } from '../src/reading-data.ts';
import { applyEffect } from '../src/importer/store.ts';
import { transition } from '../src/importer/transition.ts';
import { markRead, markUnread } from '../src/importer/read-state.ts';
import { itemDocBody } from './importer/fixtures.ts';
import { apiJson, login } from './helpers.ts';
import { withOracleStorage } from './oracle-storage.ts';

const sub = 'reader-work-source';
const origin = 'https://reader-work.example/';
const actionNames = ['read', 'page', 'mark', 'scan', 'clear', 'rename', 'placement', 'html', 'background', 'diagnostics', 'arrive', 'revise', 'reject', 'bad-cursor', 'newest', 'forget-cache'] as const;
type Action = typeof actionNames[number];
type Plan = { size: number; limit: number; actions: Action[] };
const id = (index: number) => `entry-${String(index).padStart(4, '0')}`;
const at = (index: number) => new Date(Date.UTC(2026, 0, 1) + index * 3_600_000).toISOString();
const body = (index: number, version = 1) => `<p>Entry ${index}, version ${version}.</p>`;
const histories = {
  arbitrary: fc.record({ size: fc.integer({ min: 3, max: 504 }), limit: fc.integer({ min: 1, max: 5 }), actions: fc.array(fc.constantFrom(...actionNames), { minLength: 0, maxLength: 16 }) }),
  runs: 25, fixedSeeds: [1702026],
  states: ['cold', 'warm', 'unrelated', 'changed', 'rejected', 'continuation', 'large', 'missing-cache', 'mark-continuation'],
  constructed: [
    { name: 'cache lifecycle', build: () => ({ size: 4, limit: 1, actions: ['read', 'page', 'mark', 'rename', 'placement', 'html', 'background', 'diagnostics', 'arrive', 'read', 'revise', 'read', 'reject', 'bad-cursor', 'forget-cache'] as Action[] }), enters: ['cold', 'warm', 'unrelated', 'changed', 'rejected', 'continuation', 'missing-cache'] },
    { name: 'exact cache chunk', build: () => ({size:500,limit:5,actions:['read'] as Action[]}), enters:['cold'] },
    { name: 'first cache tail', build: () => ({size:501,limit:5,actions:['read'] as Action[]}), enters:['large'] },
    { name: 'past replay window', build: () => ({ size: 504, limit: 1, actions: ['mark', 'read', 'arrive', 'reject'] as Action[] }), enters: ['large'] },
    { name: 'mark while scanning', build: () => ({size:6,limit:1,actions:['scan','clear','page'] as Action[]}), enters:['mark-continuation'] },
  ],
};
type Entry = { index: number; times: number[]; read: number | null; hidden: boolean; html: string };
type Expected = { status: number; rows: { id: string; html: string; read: number | null }[]; more: boolean; maxReturned: number; maxWritten: number; maxCalls: number; positions?: string[]; state: string };
// For unpinned fragments every arrival goes to the front and every substantial
// revision swaps with the preceding entry (docs/pace-layered-feed.md). Replaying
// those list edits is independent of production's depth/layer representation.
// Latest activity selects the bounded replay window; older entries follow it.
function model(plan: Plan): Expected[] {
  const entries: Entry[] = Array.from({ length: plan.size }, (_, index) => ({ index, times: [index], read: null, hidden: false, html: body(index) }));
  let dirty = true, built = false;
  const saved: { cursor: { offset: number; valid: boolean } | null } = { cursor: null };
  const expected: Expected[] = [];
  function read(mode: 'pace' | 'page' | 'reject' | 'bad-cursor' | 'newest' = 'pace', afterMark = false) {
    if (mode === 'reject') { dirty = true; if (saved.cursor) saved.cursor.valid = false; }
    const rejected = mode === 'reject' || mode === 'bad-cursor' || mode === 'page' && saved.cursor !== null && !saved.cursor.valid;
    const rebuild = !rejected && mode !== 'newest' && dirty;
    const newest = [...entries].sort((a, b) => b.times.at(-1)! - a.times.at(-1)!);
    const window = newest.slice(0, 500), ranked: number[] = [];
    const events = window.flatMap(e => e.times.map((time, version) => ({ index: e.index, time, version }))).sort((a, b) => a.time - b.time);
    for (const event of events) {
      const position = ranked.indexOf(event.index);
      if (event.version === 0) ranked.unshift(event.index);
      else if (position > 0) [ranked[position - 1], ranked[position]] = [ranked[position], ranked[position - 1]];
    }
    const ordered = mode === 'newest' ? newest.map(e => e.index) : [...ranked, ...newest.slice(500).map(e => e.index)];
    const visible = ordered.filter(index => !entries[index].hidden);
    const offset = mode === 'page' && saved.cursor?.valid ? saved.cursor.offset : 0;
    const selected = rejected ? [] : visible.slice(offset, offset + plan.limit);
    const more = !rejected && offset + plan.limit < visible.length;
    expected.push({ status: rejected ? mode === 'bad-cursor' ? 400 : 409 : 200,
      rows: selected.map(index => ({ id: id(index), html: entries[index].html, read: entries[index].read })), more,
      maxReturned: rejected ? 1 : 8 + 4 * plan.limit + (rebuild ? 3 * entries.length : 0),
      maxWritten: rebuild ? 4 * entries.length + 4 : 0, maxCalls: rejected ? 1 : 24 + (rebuild ? entries.length : 0),
      positions: rejected || mode==='newest' ? undefined : [...ranked,...newest.slice(500).map(e=>e.index)].map(id),
      state: rejected ? 'rejected' : rebuild ? built ? 'changed' : 'cold' : afterMark && saved.cursor?.valid ? 'mark-continuation' : 'warm' });
    if (!rejected && mode !== 'newest') { dirty = false; built = true; saved.cursor = more ? { offset: offset + plan.limit, valid: true } : null; }
  }
  read(); read();
  for (const [serial, action] of plan.actions.entries()) {
    switch (action) {
      case 'forget-cache': dirty = true; built = false; read(); break;
      case 'read': read(); break;
      case 'page': read('page'); break;
      case 'reject': read('reject'); break;
      case 'bad-cursor': read('bad-cursor'); break;
      case 'newest': read('newest'); break;
      case 'arrive': { const index = entries.length; entries.push({ index, times: [600 + serial], read: null, hidden: false, html: body(index) }); dirty = true; if (saved.cursor) saved.cursor.valid = false; break; }
      case 'revise': { const entry = entries[0]; entry.times.push(600 + serial); entry.html = body(0, entry.times.length); dirty = true; if (saved.cursor) saved.cursor.valid = false; break; }
      case 'mark': entries[0].read = 1; read(); break;
      case 'scan': entries[0].read = 1; read('page',true); break;
      case 'clear': entries[0].read = null; read('page',true); break;
      case 'placement': entries[0].hidden = !entries[0].hidden; read(); break;
      case 'html': entries[0].html = '<p>Repaired entry.</p>'; read(); break;
      default: read();
    }
  }
  return expected;
}
const law='bounded derived-data work';
oracleProperty({
  id:'reader-derived-work', owns:['src/reading-data.ts#readingData','src/feeds/reader-order-cache.ts#ensureReaderOrder','src/cursor-page.ts#cursorPage'],
  law:{statement:'For every reading history, return the correct ordered page or documented cursor error while materialization and writes stay page-bounded for unchanged inputs and validation-bounded for rejected requests; rebuilding changed inputs stays linear in source size.',authority:'Kyle Mathews (GitHub KyleAMathews), approved #170 work-oracle plan, 2026-11-22; docs/pace-layered-feed.md; docs/api.md; Venkat (GitHub vgururao), #171 read marks preserve cursors, 2026-11-22.',limits:'Local D1, unpinned non-maintenance fragments; page-selection rows_read are recorded but not constant-bounded. Materialization/writes/calls are bounded; no wall-clock or deployed billing claim.'},
  histories,model,
  reached:(plan)=>[...(plan.size>500?['large']:[]),...new Set(model(plan).map(e=>e.state)),...(plan.actions.some(a=>['mark','rename','placement','html','background','diagnostics'].includes(a))?['unrelated']:[]),...(plan.actions.includes('page')?['continuation']:[]),...(plan.actions.includes('forget-cache')?['missing-cache']:[])],
  driver:async(plan,observe)=>{
    await withOracleStorage(async()=>{
      await env.DB.prepare("INSERT INTO subscriptions(id,kind,origin,feed_url,title,created) VALUES(?,'blyg',?,?,'Source','2026-01-01')").bind(sub,origin,origin+'feed.xml').run();
      const initial=Array.from({length:plan.size},(_,index)=>[id(index),at(index),body(index),`Entry ${index}, version 1.`]);
      await env.DB.prepare(`INSERT INTO imported_items(subscription_id,remote_id,kind,state,version,created,updated,observed_at,content_html,content_md)
        SELECT ?,json_extract(value,'$[0]'),'fragment','current',1,json_extract(value,'$[1]'),json_extract(value,'$[1]'),'2026-11-22T00:00:00.000Z',json_extract(value,'$[2]'),json_extract(value,'$[3]') FROM json_each(?)`).bind(sub,JSON.stringify(initial)).run();
      const counted=measureD1(env.DB),cookie=await login();let cursor:string|undefined,next=plan.size,version=1,hidden=false,serial=0;const revisionTimes=[0];
      async function read(mode:'pace'|'page'|'reject'|'bad-cursor'|'newest'='pace'){
        let token=mode==='page'?cursor:undefined;
        if(mode==='reject'){
          const first=await readingData(env.DB,{limit:1},'all',undefined,false,undefined,undefined,[],false,'pace-layered');
          token=first.page.nextCursor??undefined;
          await env.DB.prepare('UPDATE change_state SET epoch=lower(hex(randomblob(16))) WHERE id=1').run();
        }
        if(mode==='bad-cursor')token='invalid!';
        counted.reset();let value:unknown;
        try{
          const page=await readingData(counted.db,{limit:plan.limit,...(token?{cursor:token}:{})},'all',undefined,false,undefined,undefined,[],false,mode==='newest'?'newest':'pace-layered');
          if(mode!=='newest')cursor=page.page.nextCursor??undefined;
          const positions=mode==='newest'?undefined:(await env.DB.prepare('SELECT id FROM reading_order ORDER BY position').all<{id:string}>()).results.map(row=>row.id);
          value={status:200,positions,rows:page.items.map(entry=>({id:entry.imported?.remoteId,html:entry.contentHtml,read:entry.imported?.readVersion})),more:page.page.nextCursor!==null};
        }catch(error){value={status:error instanceof Error&&'code'in error&&error.code==='cursor-expired'?409:error instanceof Error&&'code'in error&&error.code==='invalid-input'?400:500,rows:[],more:false,...(error instanceof Error&&'code'in error?{}:{error:String(error)})};}
        observe('page',{...(value as object),work:{...counted.totals}});
      }
      async function mutation(method:string,path:string,data:unknown){const response=await apiJson(cookie,method,path,data);observe('mutation',response.status);}
      async function arrive(index:number,v=1){
        const content=v===1?`Entry ${index}, version 1.`:Array.from({length:20},(_,i)=>`${String.fromCharCode(65+v)}${i}`).join(' ');
        const doc=JSON.parse(await itemDocBody({id:id(index),kind:'fragment',version:v,created:at(v===1?600+serial-1:index),updated:at(600+serial-1),origin,content_md:content,content_html:body(index,v)}));
        if(v>1)revisionTimes.push(600+serial-1);
        doc.changelog=(v===1?[600+serial-1]:revisionTimes).map((time,i)=>({version:i+1,at:at(time)}));
        await applyEffect(env.DB,sub,id(index),transition({local:v===1?{status:'absent'}:{status:'current',version:v-1},doc}).effect,'2026-11-22T00:00:00.000Z');
      }
      await read();await read();
      for(const action of plan.actions){serial++;switch(action){
        case 'forget-cache':await env.DB.prepare('DELETE FROM reading_order_state').run();await read();break;
        case 'read':await read();break;case 'page':await read('page');break;case 'reject':await read('reject');break;case 'bad-cursor':await read('bad-cursor');break;case 'newest':await read('newest');break;
        case 'arrive':await arrive(next++);break;case 'revise':await arrive(0,++version);break;
        case 'mark':await markRead(env.DB,sub,id(0),1);await read();break;
        case 'scan':await markRead(env.DB,sub,id(0),1);await read('page');break;
        case 'clear':await markUnread(env.DB,sub,id(0));await read('page');break;
        case 'rename':await mutation('PATCH','/blyg/api/subscriptions/'+sub,{title:'Source '+serial});await read();break;
        case 'placement':hidden=!hidden;await mutation('PUT','/blyg/api/reading/placement',{source:'imported',sub,id:id(0),placement:hidden?'background':null});await read();break;
        case 'html':await env.DB.prepare('UPDATE imported_items SET content_html=? WHERE subscription_id=? AND remote_id=?').bind('<p>Repaired entry.</p>',sub,id(0)).run();await read();break;
        case 'background':await env.DB.prepare('UPDATE imported_items SET bg_reasons=? WHERE subscription_id=? AND remote_id=?').bind(JSON.stringify(['near-same',String(serial)]),sub,id(0)).run();await read();break;
        case 'diagnostics':await env.DB.prepare('UPDATE subscriptions SET last_poll_at=?,fail_count=? WHERE id=?').bind(at(serial),serial,sub).run();await read();break;
      }}
    });observe('complete',true);
  },
  check:(_plan,trace,expected)=>{
    for(const event of trace.filter(e=>e.checkpoint==='mutation')){const bad=differs('mutation',law,event.value,200);if(bad)return bad;}
    const rows=trace.filter(e=>e.checkpoint==='page');
    for(let i=0;i<rows.length;i++){
      const actual=rows[i].value as {status:number;rows:unknown[];more:boolean;positions?:string[];error?:string;work:{returned:number;written:number;calls:number}},wanted=expected[i];
      if(!wanted)return violation('page','Unexpected observation',law);
      const bad=differs('page',law,{status:actual.status,rows:actual.rows,more:actual.more,positions:actual.positions,error:actual.error},{status:wanted.status,rows:wanted.rows,more:wanted.more,positions:wanted.positions,error:undefined});if(bad)return bad;
      for(const [metric,bound]of [['returned',wanted.maxReturned],['written',wanted.maxWritten],['calls',wanted.maxCalls]]as const)if(actual.work[metric]>bound)return violation('page',`${metric}: ${actual.work[metric]} exceeds ${bound} at page ${i}`,law);
    }
    return trace.some(e=>e.checkpoint==='complete')?differs('complete',law,rows.length,expected.length)??pass:pass;
  },
  calibrations:[{name:'unchanged results hide a full rewrite',law,history:{constructed:'cache lifecycle'},corrupt:trace=>trace.map((entry,index)=>entry.checkpoint==='page'&&index===1?{...entry,value:{...(entry.value as object),work:{returned:0,written:1,calls:1}}}:entry)}],
});
