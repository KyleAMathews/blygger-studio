/** Consent identifies the complete registered return destination at the owner
 * authorize response. This owns oauth-routes' native callback disclosure.
 *
 * authorize({ redirect_uri: 'org.example.editor:/oauth/callback' }) // → consent shows scheme and path
 * authorize({ redirect_uri: 'http://127.0.0.1:54321/editor/callback' }) // → consent shows host, port and path
 *
 * A host alone cannot identify a private-use scheme or distinguish two local
 * callbacks. For every allowed registered native callback, consent preserves the
 * entire validated destination (RFC8252 §§7.1–7.3 and RFC9700 §4.1). The plan is
 * the callback URI; the model derives its disclosure from that input, without
 * reading registration or page output. The driver records registration, authorize
 * status and HTML. The check compares all three at the completed responses.
 * This finite URI set does not prove app identity or prevent scheme interception.
 */
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { flow } from './oauth-flow-driver.ts';
import { withOracleStorage } from './oracle-storage.ts';

const callbacks = ['org.example.editor:/oauth/callback', 'http://127.0.0.1:54321/editor/callback'];
// Registration of an allowed callback creates a client. Its owner authorize
// response is a consent page whose destination is the exact input URI.
const model = (redirect: string) => ({ registration: 201, consent: 200, disclosure: redirect });
oracleProperty({
  id: 'consent-destination-security',
  owns: ['src/oauth-routes.ts'],
  law: { statement: 'For every allowed registered native callback, owner consent identifies its complete validated scheme, host, port and callback path.', authority: 'RFC8252 §§7.1–7.3 https://www.rfc-editor.org/rfc/rfc8252#section-7; RFC9700 §4.1 https://www.rfc-editor.org/rfc/rfc9700#section-4.1; existing consent disclosure contract', limits: 'The original private-scheme and loopback URI witnesses; disclosure establishes neither app identity nor interception resistance.' },
  histories: callbacks,
  label: redirect => 'consent identifies the exact native destination ' + redirect,
  model,
  // flow() is fixture setup; its own failures keep their original diagnostics.
  // No expected answer or comparison executes in this receiving driver.
  driver: async (redirect, observe) => { await withOracleStorage(async () => {
    const f = await flow();
    const registered = await f.request(f.issuer + '/oauth2/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_name: 'Native editor', application_type: 'native', redirect_uris: [redirect], token_endpoint_auth_method: 'none' }) });
    observe('native callback registration', registered.status);
    const body = await registered.json() as { client_id?: string };
    if (!body.client_id) return;
    const authorize = new URL(f.authorize); authorize.searchParams.set('client_id', body.client_id); authorize.searchParams.set('redirect_uri', redirect);
    const consent = await f.request(authorize.href, { headers: { cookie: f.owner } });
    observe('native callback consent', consent.status);
    const destinations: string[] = [];
    await new HTMLRewriter().on('strong', { text(chunk) { if (chunk.text) destinations.push(chunk.text); } }).transform(new Response(await consent.text())).text();
    observe('native callback disclosure', destinations);
  }); observe('native callback complete', true); },
  check: (_redirect, trace, expected) => {
    for (const entry of trace) {
      const wanted = entry.checkpoint === 'native callback registration' ? expected.registration : entry.checkpoint === 'native callback consent' ? expected.consent : undefined;
      const mismatch = entry.checkpoint === 'native callback disclosure'
        ? differs(entry.checkpoint, 'complete native destination', Array.isArray(entry.value) && entry.value.includes(expected.disclosure), true)
        : wanted === undefined ? undefined : differs(entry.checkpoint, 'complete native destination', entry.value, wanted);
      if (mismatch) return mismatch;
    }
    return trace.some(entry => entry.checkpoint === 'native callback complete') ? differs('native callback complete', 'complete native destination', trace.map(entry => entry.checkpoint), ['native callback registration', 'native callback consent', 'native callback disclosure', 'native callback complete']) ?? pass : pass;
  },
  calibrations: [{ name: 'callback path omitted', law: 'complete native destination', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'native callback disclosure' ? { ...entry, value: ['Native editor'] } : entry) }],
});
