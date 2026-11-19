/** This oracle owns public-only outbound destinations at the importer and
 * Webmention adapters' completed fetch boundary in src/outbound-policy.ts.
 *
 * ```ts
 * platformFetch('http://127.0.0.1/private') // → destination rejection, no fetch
 * mentionFetch(publicUrlRedirectingToLoopback) // → rejection before private hop
 * mentionFetchFor({ ALLOW_PRIVATE_FETCH: 'true' })(loopback) // → LAN response
 * ```
 * A public first hop does not authorize its redirect or private DNS answers.
 * For every finite destination history, restricted destinations require explicit
 * LAN opt-in, and public neighbors remain usable. The fixture declares network
 * visibility independently of production URL classification. The model applies
 * that public/LAN rule to literal, redirect and DNS premises; the driver records
 * raw transport destinations and returned/error outcomes for both real adapters.
 * Fetch is only a recorder with controlled responses. These histories preserve
 * canonical/special-name addresses, credentials, mixed DNS answers and redirects.
 * DNS rebinding between validation and connection remains outside this boundary.
 * Authority: public-by-default operator policy and OWASP SSRF prevention guidance.
 */
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { vi } from 'vitest';
import { platformFetch, platformFetchFor } from '../src/importer/http.ts';
import { mentionFetch, mentionFetchFor } from '../src/mentions/http.ts';
import { completed, outcome, receivingTrace, type Outcome } from './network-oracle-observations.ts';
type Peer = { address: string; visibility: 'public' | 'private' };
type Plan = { name: string; subjects: ('importer' | 'webmention')[]; url: string; visibility: 'public' | 'private'; allowPrivate: boolean; credentials?: boolean; redirect?: { url: string; visibility: 'public' | 'private' }; dns?: Peer[]; body: string };
const blocked = ['http://localhost/private', 'http://localhost./private', 'http://127.1/private', 'http://2130706433/private', 'http://0x7f000001/private', 'http://10.0.0.1/private', 'http://172.16.0.1/private', 'http://192.168.1.1/private', 'http://169.254.169.254/latest/meta-data', 'http://[::1]/private', 'http://[::ffff:127.0.0.1]/private', 'http://[fc00::1]/private', 'https://printer.local/private', 'https://user:password@public.example/private'];
const publicDns: Peer[] = [{ address: '93.184.216.34', visibility: 'public' }];
const histories: Plan[] = [
  ...(['importer', 'webmention'] as const).flatMap(subject => blocked.map(url => ({ name: subject + ' denies restricted destination ' + url + ' before network work', subjects: [subject], url, visibility: 'private' as const, credentials: url.includes('user:password@'), allowPrivate: false, body: 'private target reached' }))),
  { name: 'Webmention rechecks a redirect from a public host to a private target', subjects: ['webmention'], url: 'https://publisher.example/mention', visibility: 'public', allowPrivate: false, redirect: { url: 'http://127.0.0.1/private', visibility: 'private' }, dns: publicDns, body: 'private target reached' },
  ...[[{ address: '127.0.0.1', visibility: 'private' as const }], [{ address: '93.184.216.34', visibility: 'public' as const }, { address: '10.0.0.1', visibility: 'private' as const }], [{ address: '::ffff:127.0.0.1', visibility: 'private' as const }], [{ address: 'fd00::1', visibility: 'private' as const }]].map(dns => ({ name: 'denies hostnames with restricted DNS answers: ' + JSON.stringify({ addresses: dns.map(peer => peer.address) }), subjects: ['importer', 'webmention'] as ('importer' | 'webmention')[], url: 'https://publisher.example/', visibility: 'public' as const, allowPrivate: false, dns, body: 'private target reached' })),
  { name: 'the explicit LAN opt-in preserves local subscriptions and mentions', subjects: ['importer', 'webmention'], url: 'http://127.0.0.1/feed', visibility: 'private', allowPrivate: true, body: 'LAN neighbor' },
  { name: 'public DNS neighbors still reach the importer and mentions transport', subjects: ['importer', 'webmention'], url: 'https://publisher.example/', visibility: 'public', allowPrivate: false, dns: publicDns, body: 'Public neighbor' },
];
// Visibility is the controlled fixture premise, not a production classifier.
// Any restricted member denies the entire destination unless LAN is opted in.
function model(plan: Plan) {
  const restricted = plan.visibility === 'private' || plan.credentials || plan.redirect?.visibility === 'private' || plan.dns?.some(peer => peer.visibility === 'private');
  return { denied: !!restricted && !plan.allowPrivate, body: plan.body, noNetwork: plan.visibility === 'private' && !plan.allowPrivate, forbidDestination: plan.redirect?.visibility === 'private' ? plan.redirect.url : plan.dns?.some(peer => peer.visibility === 'private') ? plan.url : undefined };
}
oracleProperty({
  id: 'outbound-destination-security', owns: ['src/outbound-policy.ts', 'src/importer/http.ts', 'src/mentions/http.ts'],
  law: { statement: 'For every finite literal, DNS and redirect destination history, restricted destinations are denied before their transport unless LAN fetching is explicitly enabled, while public neighbors work.', authority: 'Existing public-by-default/LAN-opt-in operator ruling; https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html', limits: 'Original fixed address/redirect/DNS corpus on controlled fetch; no connection-time DNS rebinding proof.' },
  histories, label: plan => plan.name, model,
  driver: (plan, observe) => completed(observe, async () => {
    for (const subject of plan.subjects) {
      const destinations: string[] = [];
      const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
        const url = String(input instanceof Request ? input.url : input); destinations.push(url);
        if (url.startsWith('https://cloudflare-dns.com/')) return Response.json({ Status: 0, Answer: (plan.dns ?? publicDns).map(peer => ({ type: peer.address.includes(':') ? 28 : 1, data: peer.address })) });
        if (plan.redirect && url === plan.url) return new Response(null, { status: 302, headers: { Location: plan.redirect.url } });
        return new Response(plan.body);
      });
      try {
        const fetcher = subject === 'importer' ? (plan.allowPrivate ? platformFetchFor({ ALLOW_PRIVATE_FETCH: 'true' }) : platformFetch) : (plan.allowPrivate ? mentionFetchFor({ ALLOW_PRIVATE_FETCH: 'true' }) : mentionFetch);
        observe('outbound destination settled', { subject, result: await outcome(async () => (await fetcher(plan.url)).text()), destinations });
      } finally { spy.mockRestore(); }
    }
  }),
  check: (plan, rawTrace, expected) => {
    const { observations: trace, complete } = receivingTrace(rawTrace);
    const count = differs(trace[plan.subjects.length]?.checkpoint ?? 'outbound receiving paths', 'public destination policy', trace.length, complete ? plan.subjects.length : Math.min(trace.length, plan.subjects.length)); if (count) return count;
    for (let index = 0; index < trace.length; index++) {
      // All destination predicates judge this received adapter outcome; aliases
      // would lose its failure if cleanup subsequently throws.
      const entry = trace[index], actual = entry.value as { subject: string; result: Outcome<string>; destinations: string[] };
      const receiving = actual.result.kind === 'threw' ? { denied: true, destinationError: /destination/i.test(actual.result.message), body: undefined } : { denied: false, destinationError: true, body: actual.result.value };
      const mismatch = differs(entry.checkpoint, 'public destination policy', { subject: actual.subject, ...receiving }, { subject: plan.subjects[index], denied: expected.denied, destinationError: true, body: expected.denied ? undefined : expected.body })
        ?? (expected.noNetwork ? differs(entry.checkpoint, 'public destination policy', actual.destinations, []) : undefined)
        ?? (expected.forbidDestination ? differs(entry.checkpoint, 'public destination policy', actual.destinations.includes(expected.forbidDestination), false) : undefined)
        ?? (plan.dns?.some(peer => peer.visibility === 'private') ? differs(entry.checkpoint, 'public destination policy', actual.destinations.filter(url => !url.startsWith('https://cloudflare-dns.com/')), []) : undefined)
        ?? (plan.allowPrivate ? differs(entry.checkpoint, 'public destination policy', actual.destinations.length, 1) : undefined);
      if (mismatch) return mismatch;
    }
    return pass;
  },
  calibrations: [{ name: 'private target reached', law: 'public destination policy', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint !== 'outbound destination settled' ? entry : ({ ...entry, value: { ...(entry.value as object), result: { kind: 'returned', value: 'private target reached' } } })) }],
});
