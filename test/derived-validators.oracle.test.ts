/**
 * This oracle owns representation validators at the Worker receiving boundary:
 * HTTP reads must see classifications and mention indexes settled by their real
 * D1 writers while change_state stays still. It owns conditionalOperation's
 * choice of validator shortcut.
 *
 * ```ts
 * GET /items/id, If-None-Match: old // → 200 with current classification after settlement
 * GET /items/id/versions, If-None-Match: old // → 200 with current classification after settlement
 * GET /reading?mentions=true, If-None-Match: old // → 200 with current entries after indexing
 * GET /reading/summary?mentions=true, If-None-Match: current // → bodyless 304 when bytes stay equal
 * ```
 * Why can the resource change while its counter stays still? Classification
 * settlement and mention backfill write derived tables. A validator names the
 * representation; counters can only save work when they track those bytes.
 *
 * For every private resource GET after derived settlement, changed bytes return
 * 200 with current bytes and a new validator; unchanged bytes permit bodyless
 * 304, and an unrelated resource retains its validator. Authority: Decision by
 * Kyle Mathews (GitHub KyleAMathews), 2026-11-18: correct resource validators,
 * also documented in docs/api.md.
 *
 * The shared pure model compares input values. All fourteen receiving histories
 * run: add/update/clear/equal classification for detail/history, and backfill/
 * remove/equal mention index for list/summary. The driver checks intended fields,
 * conditional bytes against fresh HTTP bytes, counters, repeats and a neighbor.
 * The generated Node companion varies abstract values; this companion establishes
 * actual writers, queries and HTTP handling. No design-grammar trigger fires:
 * the one-rule model stays unchanged while this adds a receiving driver.
 * Limits: local owner HTTP/D1, one published version and one imported mention;
 * deployed Cloudflare behavior and arbitrary SQL writers are outside this matrix.
 */
import { env, SELF } from 'cloudflare:test';
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { BASE, login, apiJson, testItemRevision } from './helpers.ts';
import { settleChangeClass } from '../src/change-class.ts';
import { backfillImportedMentions, syncImportedMentions } from '../src/importer/mention-index.ts';
import { derivedRepresentation } from '../test-oracles/derived-validators.model.ts';

type Json = Record<string, any>;
type History =
  | { writer: 'classification'; projection: 'detail' | 'history'; transition: 'add' | 'update' | 'clear' | 'unchanged'; before: 'absent' | 'minor' | 'major'; after: 'major' | null }
  | { writer: 'mention-index'; projection: 'list' | 'summary'; transition: 'backfill' | 'remove' | 'unchanged'; before: number; after: number };

// Every member of this finite receiving matrix runs; generated abstract range
// belongs to the Node companion rather than these real I/O histories.
const histories: History[] = [
  ...(['detail', 'history'] as const).flatMap(projection => (['add', 'update', 'clear', 'unchanged'] as const).map(transition => ({
    writer: 'classification' as const, projection, transition,
    before: transition === 'add' ? 'absent' as const : transition === 'update' ? 'minor' as const : 'major' as const,
    after: transition === 'clear' ? null : 'major' as const,
  }))),
  ...(['list', 'summary'] as const).flatMap(projection => (['backfill', 'remove', 'unchanged'] as const).map(transition => ({
    writer: 'mention-index' as const, projection, transition,
    before: transition === 'backfill' ? 0 : 1, after: transition === 'remove' ? 0 : 1,
  }))),
];
const law = 'correct derived validators at receiving boundary';
oracleProperty({
  id: 'derived-resource-validators-receiving',
  owns: ['src/conditional-operation.ts#conditionalOperation'],
  law: {
    statement: 'For every private resource GET after derived classification or mention-index settlement, changed bytes return 200 with current bytes and a new validator despite unchanged counters; unchanged bytes permit bodyless 304 and unrelated resources retain their validator.',
    authority: 'Decision by Kyle Mathews (GitHub KyleAMathews), 2026-11-18: correct resource validators; docs/api.md resource validators.',
    limits: 'Local owner HTTP/D1 receiving matrix: fourteen enumerated real writer paths, one published version or one imported mention. Generated abstract field range belongs to the Node companion.',
  },
  histories: { enumerated: histories, states: [...new Set(histories.flatMap(h => [h.projection, `${h.writer}-${h.transition}`]))] },
  label: h => `${h.projection}-${h.transition}`,
  // Input values alone determine change, independently of SQL and HTTP.
  model: plan => derivedRepresentation(plan.before, plan.after),
  driver: async (plan, observe) => {
    const cookie = await login();
    const { projection, transition } = plan;
    const sub = `derived-${projection}-${transition}`;
    let id: string | undefined;
    const backfill = await env.DB.prepare('SELECT * FROM imported_mentions_backfill WHERE id = 1').first<{ after: number }>();
    try {
      if (plan.writer === 'classification') {
        const created = await apiJson(cookie, 'POST', '/blyg/api/items', { contentMd: `Derived ${projection} ${transition}`, kind: 'thread' });
        if (created.status !== 201) throw new Error(`Fixture create failed: ${created.status}`);
        id = created.json.id;
        const published = await apiJson(cookie, 'POST', `/blyg/api/items/${id}/publish`, { expectedRevision: await testItemRevision(id!) });
        if (published.status !== 200) throw new Error(`Fixture publish failed: ${published.status}`);
        if (plan.before !== 'absent') await settleChangeClass(env.DB, id!, 1, plan.before);
        const path = `/blyg/api/items/${id}${projection === 'history' ? '/versions' : ''}`;
        await record(cookie, path, async () => settleChangeClass(env.DB, id!, 1, plan.after), body => {
          const version = projection === 'history' ? body.items[0] : body.published;
          return version.changeClass ? version.changeClass.category : 'absent';
        }, observe);
      } else {
        const remote = '00000000000000000000000001';
        const owner = `${BASE}/blyg/`;
        const html = `<p><a class="h-card" href="${owner}">Owner</a></p>`;
        await env.DB.prepare("INSERT INTO subscriptions(id,kind,origin,feed_url,title,created) VALUES (?,'blyg','https://source.test/','https://source.test/feed.xml','Source','2026-01-01')").bind(sub).run();
        await env.DB.prepare("INSERT INTO imported_items(subscription_id,remote_id,kind,state,version,observed_at,content_md,content_html,l0,page) VALUES (?,?,'fragment','current',1,'2026-01-01','Mention',?,0,'https://source.test/post')").bind(sub, remote, html).run();
        if (transition !== 'backfill') await syncImportedMentions(env.DB, sub, remote, html);
        const path = `/blyg/api/reading${projection === 'summary' ? '/summary' : ''}?mentions=true`;
        await record(cookie, path, async () => {
          if (transition === 'backfill') {
            await env.DB.prepare('INSERT OR REPLACE INTO imported_mentions_backfill(id,after) VALUES(1,0)').run();
            await backfillImportedMentions(env.DB);
          } else await syncImportedMentions(env.DB, sub, remote, transition === 'remove' ? null : html);
        }, body => projection === 'summary' ? body.counts.all : body.items.length, observe);
      }
      observe('reach', projection);
      observe('reach', `${plan.writer}-${transition}`);
    } catch (error) {
      observe('error', error);
    } finally {
      // Calibration and determinism run several histories per registration.
      // Release each history's fixtures rather than relying on beforeEach.
      if (id) {
        await env.DB.prepare('DELETE FROM change_class WHERE item_id = ?').bind(id).run();
        await env.DB.prepare('DELETE FROM versions WHERE item_id = ?').bind(id).run();
        await env.DB.prepare('DELETE FROM items WHERE id = ?').bind(id).run();
      }
      await env.DB.prepare('DELETE FROM imported_mentions WHERE subscription_id = ?').bind(sub).run();
      await env.DB.prepare('DELETE FROM imported_items WHERE subscription_id = ?').bind(sub).run();
      await env.DB.prepare('DELETE FROM subscriptions WHERE id = ?').bind(sub).run();
      await env.DB.prepare('DELETE FROM imported_mentions_backfill WHERE id = 1').run();
      if (backfill) await env.DB.prepare('INSERT INTO imported_mentions_backfill(id,after) VALUES(1,?)').bind(backfill.after).run();
    }
  },
  // The pure model predicts values/change; the refinement also requires the
  // conditional response's complete bytes to equal a separate fresh GET.
  check: (plan, trace, expected) => {
    const value = (checkpoint: string) => trace.find(o => o.checkpoint === checkpoint)?.value;
    return differs('error', law, value('error') ?? null, null)
      ?? differs('initial', law, value('initial'), { status: 200, tag: true, value: plan.before })
      ?? differs('counters', law, value('counters'), { unchanged: true })
      ?? differs('current', law, value('current'), { status: expected.status, value: plan.after, freshStatus: 200, changed: expected.changed, tag: true, sameTag: true, body: expected.changed ? 'current' : 'empty' })
      ?? differs('repeat', law, value('repeat'), { status: 304, body: '', sameTag: true })
      ?? differs('neighbor', law, value('neighbor'), { status: 304, tag: true, sameTag: true, body: '' }) ?? pass;
  },
  calibrations: [{ name: 'stale-derived-304', law, history: { enumerated: 'detail-add' }, corrupt: trace => trace.map(o => o.checkpoint === 'current' ? { ...o, value: { ...(o.value as Json), status: 304, changed: false, body: 'empty' } } : o) }],
});

// Record only normalized relations, so random item IDs, cookies and hashes do
// not make the framework's determinism replay compare different fixtures.
async function record(cookie: string, path: string, write: () => Promise<void>, value: (body: Json) => unknown, observe: (checkpoint: string, value: unknown) => void) {
  const get = (target: string, etag?: string) => SELF.fetch(BASE + target, { headers: { cookie, ...(etag ? { 'If-None-Match': etag } : {}) } });
  const first = await get(path), tag = first.headers.get('etag')!;
  observe('initial', { status: first.status, tag: Boolean(tag), value: value(await first.json<Json>()) });
  const neighbor = await get('/blyg/api/items/summary'), neighborTag = neighbor.headers.get('etag')!;
  await neighbor.text();
  const counters = await env.DB.prepare('SELECT * FROM change_state').first();
  await write();
  observe('counters', { unchanged: JSON.stringify(await env.DB.prepare('SELECT * FROM change_state').first()) === JSON.stringify(counters) });
  const conditional = await get(path, tag);
  const fresh = await get(path), freshBody = await fresh.text();
  const conditionalBody = await conditional.text(), freshTag = fresh.headers.get('etag');
  observe('current', { status: conditional.status, value: value(JSON.parse(freshBody)), freshStatus: fresh.status, changed: freshTag !== tag, tag: Boolean(freshTag), sameTag: conditional.headers.get('etag') === freshTag, body: conditionalBody === '' ? 'empty' : conditionalBody === freshBody ? 'current' : 'stale' });
  const repeated = await get(path, fresh.headers.get('etag')!);
  observe('repeat', { status: repeated.status, body: await repeated.text(), sameTag: repeated.headers.get('etag') === freshTag });
  const neighborAfter = await get('/blyg/api/items/summary', neighborTag);
  observe('neighbor', { status: neighborAfter.status, tag: Boolean(neighborTag), sameTag: neighborAfter.headers.get('etag') === neighborTag, body: await neighborAfter.text() });
}
