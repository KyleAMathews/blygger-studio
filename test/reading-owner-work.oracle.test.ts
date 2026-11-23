/**
 * Warm pace-layered owner requests add bounded cache validation to the same
 * Reading operation in newest order. This receiving oracle owns readingData
 * and its position cache through full authenticated Worker HTTP requests.
 *
 * GET /api/reading?order=pace-layered // → correct page with bounded warm overhead
 * poll(); autosave(); markRead(); GET /api/reading // → no derived rewrite
 * GET /api/reading?cursor=next // → next page with the same bounded overhead
 *
 * A direct readingData call cannot see admission or validator queries. Here
 * newest order is a paired control for that shared request work. Both orders
 * have the same route, policy, page size and unpinned arrival sequence, so the
 * warm pace request owes no extra writes and only bounded validation work.
 * Their common admission cost remains visible; it is not declared free.
 *
 * For every receiving history, correct held-item pages keep continuations
 * across read marks, with linear cold work and bounded warm derived overhead
 * independently of source size after unchanged ranking inputs.
 * Kyle Mathews (GitHub KyleAMathews), 2026-11-22, #170 work-preservation decision;
 * #171 supplies the 5,760-item poll/autosave/read-mark and six-page walk premises.
 * Its follow-up (Venkat, GitHub vgururao, 2026-11-22) requires marks to preserve
 * continuations and imports without a subscription to be absent from pages.
 *
 * The model derives identities from arrival indices. Two finite scale witnesses
 * run the same interleaved writes and paired HTTP driver, with the larger one
 * walking six 50-row pages with marks between them. Both scales include imports
 * whose subscriptions are gone; normal and Raw reads must cut pages only from
 * held entries. The generated core oracle supplies wider histories.
 * Native work includes auth, admission, validators and completed deferred work.
 * Limits: local primary D1; no network RTT, replica, placement, browser loader
 * dependency graph or wall-clock claim. An equal cost in both orders can still
 * be unnecessary shared request work; this oracle does not judge admission.
 */
import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { makeApp } from '../src/index.ts';
import { markRead, markUnread } from '../src/importer/read-state.ts';
import { login } from './helpers.ts';
import { withOracleStorage } from './oracle-storage.ts';
import { measureD1 } from '../test-oracles/d1-work.ts';

const law='bounded derived work through owner requests';
const actions=['warm','poll','autosave','read','unread','repair','warm'] as const;
const histories=[{size:25,walk:false,orphans:3},{size:5760,walk:true,orphans:431}];
const id=(index:number)=>`owner-work-${String(index).padStart(6,'0')}`;
const time=(index:number)=>new Date(Date.UTC(2026,0,1)+index*3_600_000).toISOString();
oracleProperty({
  id:'reading-owner-derived-work',owns:['src/reading-data.ts#readingData','src/feeds/reader-order-cache.ts#ensureReaderOrder'],
  law:{statement:'For every receiving history, correct held-item pages keep continuations across read marks, with linear cold work and bounded warm derived overhead independently of source size after unchanged ranking inputs.',authority:'Kyle Mathews (GitHub KyleAMathews), #170 general work decision; Venkat (GitHub vgururao), #171 held-item and marks rules, 2026-11-22.',limits:'Two finite full HTTP primary-D1 scale witnesses; newest order controls shared request overhead. No RTT/browser scheduling or admission-efficiency claim.'},
  histories:{enumerated:histories,states:['cold','warm','poll-between','autosave-between','read-between','orphan-imports','large','deep-walk','mark-continuation']},
  label:plan=>String(plan.size),
  model:plan=>{
    const ids=(offset:number,limit:number)=>Array.from({length:Math.min(limit,plan.size-offset)},(_,index)=>id(plan.size-1-offset-index));
    return {coldMaximumWrites:6*plan.size+100,coldMaximumRows:4*plan.size+100,coldMaximumCalls:plan.size+50,coldIds:ids(0,1),pairs:[...actions.map(()=>ids(0,1)),...(plan.walk?Array.from({length:6},(_,page)=>ids(page*50,50)):[])]};
  },
  reached:plan=>['cold','warm','poll-between','autosave-between','read-between',...(plan.orphans>0?['orphan-imports']:[]),...(plan.size>500?['large']:[]),...(plan.walk?['deep-walk','mark-continuation']:[])],
  driver:async(plan,observe)=>{
    await withOracleStorage(async()=>{
      const cookie=await login(),app=makeApp('/blyg');
      await env.DB.batch([
        env.DB.prepare("INSERT INTO subscriptions(id,kind,origin,feed_url,title,created) VALUES('owner-work-sub','blyg','https://owner-work.example/','https://owner-work.example/feed.xml','Owner work','2026-01-01')"),
        env.DB.prepare("INSERT INTO items(id,created,updated,content_md) VALUES('owner-work-draft','2026-01-01','2026-01-01','draft')"),
      ]);
      const initial=Array.from({length:plan.size},(_,index)=>[id(index),time(index)]);
      await env.DB.prepare(`INSERT INTO imported_items(subscription_id,remote_id,kind,state,version,created,updated,observed_at,content_md,content_html)
        SELECT 'owner-work-sub',json_extract(value,'$[0]'),'fragment','current',1,json_extract(value,'$[1]'),json_extract(value,'$[1]'),'2026-11-22T00:00:00.000Z','words','<p>Words</p>' FROM json_each(?)`).bind(JSON.stringify(initial)).run();
      await env.DB.prepare(`INSERT INTO imported_items(subscription_id,remote_id,kind,state,version,created,updated,observed_at,content_md,content_html)
        SELECT 'owner-work-gone',value,'fragment','current',1,'2026-11-21T00:00:00.000Z','2026-11-21T00:00:00.000Z','2026-11-22T00:00:00.000Z','orphan','<p>Orphan</p>' FROM json_each(?)`).bind(JSON.stringify(Array.from({length:plan.orphans},(_,index)=>`orphan-${index}`))).run();
      const counted=measureD1(env.DB);
      async function request(order:'pace-layered'|'newest',limit=1,cursor?:string,raw=false){
        counted.reset();const context=createExecutionContext();
        const response=await app.fetch(new Request(`https://example.com/blyg/api/reading?limit=${limit}&order=${order}${cursor?'&cursor='+encodeURIComponent(cursor):''}${raw?'&raw=true':''}`,{headers:{cookie}}),{...env,DB:counted.db},context);
        const result=await response.json() as {items?:{imported?:{remoteId:string}}[];page?:{nextCursor:string|null}};
        await waitOnExecutionContext(context);
        return {status:response.status,ids:result.items?.map(item=>item.imported?.remoteId),cursor:result.page?.nextCursor??undefined,work:{...counted.totals}};
      }
      const visible=(value:Awaited<ReturnType<typeof request>>)=>({status:value.status,ids:value.ids,more:value.cursor!==undefined,work:value.work});
      observe('cold',visible(await request('pace-layered')));
      observe('raw',visible(await request('newest',1,undefined,true)));
      for(const [index,action] of actions.entries()){
        switch(action){
          case 'poll': await env.DB.prepare("UPDATE subscriptions SET last_poll_at=?,etag=?,fail_count=? WHERE id='owner-work-sub'").bind(time(6000+index),`etag-${index}`,index).run();break;
          case 'autosave':await env.DB.prepare("UPDATE items SET content_md=?,updated=? WHERE id='owner-work-draft'").bind(`typing ${index}`,time(6000+index)).run();break;
          case 'read':await markRead(env.DB,'owner-work-sub',id(plan.size-1),1);break;
          case 'unread':await markUnread(env.DB,'owner-work-sub',id(plan.size-1));break;
          case 'repair':await env.DB.prepare("UPDATE imported_items SET content_html='<p>Repaired</p>' WHERE subscription_id='owner-work-sub' AND remote_id=?").bind(id(plan.size-1)).run();break;
        }
        observe('pair',{action,offset:0,limit:1,newest:visible(await request('newest')),pace:visible(await request('pace-layered'))});
      }
      if(plan.walk){
        let newestCursor:string|undefined,paceCursor:string|undefined;
        for(let page=0;page<6;page++){
          if(page>0){
            const scanned=id(plan.size-page*50);
            await markRead(env.DB,'owner-work-sub',scanned,1);
            if(page%2===0)await markUnread(env.DB,'owner-work-sub',scanned);
          }
          const newest=await request('newest',50,newestCursor),pace=await request('pace-layered',50,paceCursor);
          observe('pair',{action:'continue',offset:page*50,limit:50,newest:visible(newest),pace:visible(pace)});newestCursor=newest.cursor;paceCursor=pace.cursor;
        }
      }
    });observe('complete',true);
  },
  check:(plan,trace,expected)=>{
    const cold=trace.find(entry=>entry.checkpoint==='cold')?.value as {status:number;ids:string[];work:{written:number;returned:number;calls:number}}|undefined;
    if(cold){const mismatch=differs('cold',law,{status:cold.status,ids:cold.ids,bounded:cold.work.written<=expected.coldMaximumWrites&&cold.work.returned<=expected.coldMaximumRows&&cold.work.calls<=expected.coldMaximumCalls},{status:200,ids:expected.coldIds,bounded:true});if(mismatch)return mismatch;}
    const raw=trace.find(entry=>entry.checkpoint==='raw')?.value as {status:number;ids:string[]}|undefined;
    const rawMismatch=differs('raw',law,raw?{status:raw.status,ids:raw.ids}:undefined,{status:200,ids:expected.coldIds});if(rawMismatch)return rawMismatch;
    const pairs=trace.filter(entry=>entry.checkpoint==='pair');
    for(const [index,event] of pairs.entries()){
      const pair=event.value as {offset:number;limit:number;newest:{status:number;ids:string[];work:{written:number;returned:number;calls:number}};pace:{status:number;ids:string[];work:{written:number;returned:number;calls:number}}};
      const wanted=expected.pairs[index];
      const mismatch=differs('pair',law,{statuses:[pair.newest.status,pair.pace.status],ids:[pair.newest.ids,pair.pace.ids],extraWrites:pair.pace.work.written<=pair.newest.work.written,extraRows:pair.pace.work.returned-pair.newest.work.returned<=8,extraCalls:pair.pace.work.calls-pair.newest.work.calls<=4},{statuses:[200,200],ids:[wanted,wanted],extraWrites:true,extraRows:true,extraCalls:true});if(mismatch)return mismatch;
    }
    return trace.some(entry=>entry.checkpoint==='complete')?differs('complete',law,{cold:!!cold,pairs:pairs.length},{cold:true,pairs:actions.length+(plan.walk?6:0)})??pass:pass;
  },
  calibrations:[{name:'warm full request hides cache rewrite',law,history:{enumerated:'5760'},corrupt:trace=>trace.map(entry=>entry.checkpoint==='pair'?{...entry,value:{...(entry.value as object),pace:{...((entry.value as {pace:object}).pace),work:{written:100000,returned:0,calls:0}}}}:entry)}],
});
