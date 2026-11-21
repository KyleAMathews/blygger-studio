/** Imported HTML never grants active URL authority to a stored item's API or
 * public collection reader. This owns read-api's stored-import presentation.
 *
 * GET /api/imports/security/literal // → imported text with no javascript: or data: URL
 * GET /h/security-hopper/ // → safe imported text with no event-handler attribute
 *
 * An old feed format does not grant trust. For every imported fixture, surviving
 * link/media URLs must be inert under WHATWG URL parsing; public collections must
 * preserve safe text and remove event handlers. These are OWASP's untrusted-markup
 * rules, not the production sanitizer's classifications. Plans carry source bytes
 * and the receiving surface. The driver records status and parsed attributes;
 * the independent model supplies prohibited protocols and derives safe fixture
 * text. The check judges those observations at the completed response.
 * The finite corpus is structural evidence. Actual React DOM reparse/click
 * witnesses remain in e2e/imported-html-security.spec.ts.
 */
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { makeApp } from '../src/index.ts';
import { importedHtmlAttacks } from './fixtures/imported-html-attacks.ts';
import { withOracleStorage } from './oracle-storage.ts';

type Plan = { surface: 'api' | 'collection'; id: string; html: string };
const histories: Plan[] = [...importedHtmlAttacks.map(attack => ({ surface: 'api' as const, id: attack.id, html: attack.html })), { surface: 'collection', id: 'public-legacy', html: '<p>Safe imported text</p><img src="/missing" onerror="document.documentElement.dataset.compromised=1">' }];
// The reference is a capability policy, independent of the sanitizer. The URL
// platform parser normalizes controls/entities after HTMLRewriter decodes them.
const model = (plan: Plan) => ({ status: 200, forbiddenProtocols: ['javascript:', 'data:'], safeText: plan.surface === 'collection' ? plan.html.match(/<p>([^<]*)<\/p>/)?.[1] : undefined });
async function request(path: string, init: RequestInit = {}) {
  const ctx = createExecutionContext();
  const headers = new Headers(init.headers); headers.set('CF-Connecting-IP', 'fd00:' + crypto.randomUUID().replaceAll('-', '').match(/.{4}/g)!.slice(0, 7).join(':'));
  const response = await makeApp('/blyg').fetch(new Request('https://html-security.example.test' + path, { ...init, headers }), env, ctx);
  await waitOnExecutionContext(ctx); return response;
}
oracleProperty({
  id: 'imported-html-security',
  owns: ['src/read-api.ts'],
  law: { statement: 'For every stored imported HTML fixture, API links retain no active javascript/data scheme and public collection presentation preserves safe text without event-handler authority.', authority: 'OWASP XSS Prevention https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html; WHATWG URL parser https://url.spec.whatwg.org/#concept-basic-url-parser; existing imported HTML receiving contract', limits: 'Original fixed hostile corpus plus public stored-feed witness; structural attributes do not establish all browser execution behavior.' },
  histories,
  label: plan => plan.surface === 'api' ? 'keeps imported URL authority inert: ' + plan.id : 'sanitizes legacy imported content on the public collection path',
  model,
  driver: async (plan, observe) => { await withOracleStorage(async () => {
    let cookie = '';
    if (plan.surface === 'api') {
      const login = await request('/blyg/studio/login', { method: 'POST', body: new URLSearchParams({ password: env.OWNER_PASSWORD }) });
      cookie = login.headers.get('set-cookie')!.split(';')[0];
    }
    await env.DB.prepare("INSERT OR IGNORE INTO subscriptions(id,kind,origin,feed_url,title,created) VALUES ('security','rss','https://publisher.example/','https://publisher.example/feed','Security','2026-10-01')").run();
    await env.DB.prepare("INSERT INTO imported_items(subscription_id,remote_id,kind,state,version,observed_at,content_html,l0) VALUES ('security',?,'fragment','current',1,'2026-10-01',?,1)").bind(plan.id, plan.html).run();
    if (plan.surface === 'collection') {
      await env.DB.prepare("INSERT INTO hoppers(id,name,slug,public,created) VALUES ('security-hopper','Security','security-hopper',1,'2026-10-01')").run();
      await env.DB.prepare("INSERT INTO hopper_items(hopper_id,subscription_id,remote_id,added_at) VALUES ('security-hopper','security',?,'2026-10-01')").bind(plan.id).run();
    }
    const response = await request(plan.surface === 'api' ? '/blyg/api/imports/security/' + plan.id : '/blyg/h/security-hopper/', { headers: { cookie } });
    observe('imported receiving status', response.status);
    const html = plan.surface === 'api' ? (await response.json() as { content_html: string }).content_html : await response.text();
    observe('imported rendered HTML', html);
    const urls: string[] = [], attributes: string[] = [];
    await new HTMLRewriter().on('*', { element(el) { for (const [name, attribute] of el.attributes) { attributes.push(name); if (['href', 'src', 'xlink:href'].includes(name)) urls.push(attribute); } } }).transform(new Response(html)).text();
    observe('imported URL attributes', urls);
    observe('imported attribute names', attributes);
  }); observe('imported history complete', true); },
  check: (plan, trace, expected) => {
    for (const entry of trace) {
      let mismatch;
      switch (entry.checkpoint) {
        case 'imported receiving status': mismatch = differs(entry.checkpoint, 'inert imported presentation', entry.value, expected.status); break;
        case 'imported rendered HTML': if (plan.surface === 'collection') mismatch = differs(entry.checkpoint, 'inert imported presentation', typeof entry.value === 'string' && entry.value.includes(expected.safeText!), true); break;
        case 'imported URL attributes': if (plan.surface === 'api') mismatch = differs(entry.checkpoint, 'inert imported presentation', (entry.value as string[]).filter(url => expected.forbiddenProtocols.includes(new URL(url, 'https://html-security.example.test').protocol)), []); break;
        case 'imported attribute names': if (plan.surface === 'collection') mismatch = differs(entry.checkpoint, 'inert imported presentation', (entry.value as string[]).filter(name => name.toLowerCase() === 'onerror'), []); break;
      }
      if (mismatch) return mismatch;
    }
    return trace.some(entry => entry.checkpoint === 'imported history complete') ? differs('imported history complete', 'inert imported presentation', trace.map(entry => entry.checkpoint), ['imported receiving status', 'imported rendered HTML', 'imported URL attributes', 'imported attribute names', 'imported history complete']) ?? pass : pass;
  },
  calibrations: [{ name: 'active URL retained', law: 'inert imported presentation', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'imported URL attributes' ? { ...entry, value: ['javascript:alert(1)'] } : entry) }],
});
