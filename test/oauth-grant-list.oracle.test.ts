/** Owner grant revocation removes only the selected delegation and its remembered
 * consent. REST, native UserInfo and subsequent authorization requests observe the
 * change after the revocation response; another grant keeps its access and refresh.
 *
 * ```ts
 * DELETE /api/authorizations/{grant} // → 200; that grant's next read returns 401
 * GET /api/authorizations // → every live approval, including same-client siblings
 * GET /oauth2/authorize?prompt=none // → consent_required after consent is revoked
 * ```
 * Why can a valid signature stop working without changing a sibling token? The
 * grant, rather than the client registration, owns that authority. Decision #52,
 * docs/client-access.md and OIDC Core §3.1.2.1/UserInfo establish these laws.
 * https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest
 * https://openid.net/specs/openid-connect-core-1_0.html#UserInfo
 *
 * The model keeps scopes and revocation per history handle. Handles identify
 * approvals, never production token bytes. The finite grammar retains the three
 * original receiving histories. The real HTTP driver records each completed
 * response, listing cardinality and redirect result; the check compares the whole
 * ordered trace. Refresh-family replay and arbitrary list pages remain outside
 * this serial approval/revocation boundary.
 */
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { withOracleStorage } from './oracle-storage.ts';
import { flow } from './oauth-flow-driver.ts';

type Action =
  | { op: 'approve'; grant: string; scope: string; force?: boolean; direct?: boolean }
  | { op: 'read'; grant: string; surface: 'rest' | 'userinfo' }
  | { op: 'list'; draftGrant?: string }
  | { op: 'revoke' | 'refresh'; grant: string }
  | { op: 'silent' };
type Plan = { name: string; scope: string; actions: Action[] };
const histories: Plan[] = [
  { name: 'lists both grants and preserves neighboring access after owner grant revocation', scope: 'owner:read owner:draft offline_access', actions: [
    { op: 'approve', grant: 'broad', scope: 'owner:read owner:draft offline_access' },
    { op: 'approve', grant: 'narrow', scope: 'owner:read', force: true },
    { op: 'read', grant: 'broad', surface: 'rest' }, { op: 'list', draftGrant: 'broad' },
    { op: 'revoke', grant: 'broad' }, { op: 'read', grant: 'broad', surface: 'rest' },
    { op: 'read', grant: 'narrow', surface: 'rest' }, { op: 'refresh', grant: 'narrow' },
  ] },
  { name: 'applies owner grant revocation to the forwarded native UserInfo endpoint', scope: 'openid owner:read owner:draft', actions: [
    { op: 'approve', grant: 'reader', scope: 'openid owner:read owner:draft' },
    { op: 'read', grant: 'reader', surface: 'userinfo' }, { op: 'revoke', grant: 'reader' },
    { op: 'read', grant: 'reader', surface: 'userinfo' },
  ] },
  { name: 'requires new owner consent after individually revoking a grant', scope: 'owner:read', actions: [
    { op: 'approve', grant: 'reader', scope: 'owner:read', direct: true }, { op: 'silent' },
    { op: 'revoke', grant: 'reader' }, { op: 'read', grant: 'reader', surface: 'rest' }, { op: 'silent' },
  ] },
];
// Approved grants are independent records. Revocation changes that record and
// remembered consent; it does not revoke another grant for the same client.
function model(plan: Plan): Observation[] {
  const grants = new Map<string, { scope: string[]; revoked: boolean }>();
  const trace: Observation[] = [];
  for (const action of plan.actions) {
    switch (action.op) {
      case 'approve':
        grants.set(action.grant, { scope: action.scope.split(' '), revoked: false });
        if (action.force) trace.push({ checkpoint: 'grant consent', value: 200 });
        trace.push({ checkpoint: 'grant approval', value: 302 }, { checkpoint: 'grant exchange', value: 200 });
        break;
      case 'read': trace.push({ checkpoint: 'grant receiving ' + action.surface, value: grants.get(action.grant)?.revoked ? 401 : 200 }); break;
      case 'list': trace.push({ checkpoint: 'grant owner listing', value: { count: [...grants.values()].filter(grant => !grant.revoked).length, selectedDraftGrant: action.draftGrant ? grants.get(action.draftGrant)!.scope.includes('owner:draft') : true } }); break;
      case 'revoke': grants.get(action.grant)!.revoked = true; trace.push({ checkpoint: 'grant revocation', value: 200 }); break;
      case 'refresh': trace.push({ checkpoint: 'grant refresh', value: grants.get(action.grant)?.revoked ? 400 : 200 }); break;
      case 'silent': {
        const remembered = [...grants.values()].some(grant => !grant.revoked);
        trace.push({ checkpoint: 'grant noninteractive authorization', value: { status: 302, code: remembered ? 'present' : null, error: remembered ? null : 'consent_required' } }); break;
      }
    }
  }
  return trace;
}
// HTTP responses are observations. Parsing a malformed prerequisite or losing a
// fixture handle is a driver error and retains its original diagnostics.
async function driver(plan: Plan, observe: (checkpoint: string, value: unknown) => void) {
  await withOracleStorage(async () => {
    const f = await flow({ scope: plan.scope });
    const grants = new Map<string, { access_token: string; refresh_token: string; id?: string }>();
    for (const action of plan.actions) {
      switch (action.op) {
        case 'approve': {
          let approval: Response;
          if (action.force) {
            const url = new URL(f.authorize); url.searchParams.set('scope', action.scope + ' offline_access'); url.searchParams.set('prompt', 'consent');
            const consent = await f.request(url.href, { headers: { cookie: f.owner } });
            observe('grant consent', consent.status);
            const html = await consent.text(), handle = html.match(/name="handle" value="([^"]+)"/)![1];
            const binding = consent.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
            approval = await f.request(f.issuer + '/consent', { method: 'POST', headers: { cookie: f.owner + '; ' + binding, Origin: f.base }, body: new URLSearchParams({ handle, decision: 'allow', scope: action.scope }) });
          } else if (action.direct) approval = await f.request(f.issuer + '/consent', { method: 'POST', headers: { cookie: f.owner + '; ' + f.binding, Origin: f.base }, body: new URLSearchParams({ handle: f.handle, decision: 'allow', scope: action.scope }) });
          else approval = await f.decide('browser-a', true);
          observe('grant approval', approval.status);
          const response = await f.token(new URL(approval.headers.get('location')!).searchParams.get('code')!);
          observe('grant exchange', response.status);
          const token = await response.json() as { access_token: string; refresh_token: string; id?: string };
          grants.set(action.grant, token);
          // Bind opaque production IDs to the approval handle while both grants
          // are live. A missing listing is observed rather than silently repaired.
          const listing = await (await f.request('/blyg/api/authorizations', { headers: { cookie: f.owner } })).json() as { items: { id: string; clientId: string; scope: string[] }[] };
          const used = new Set([...grants.values()].flatMap(grant => grant.id ? [grant.id] : []));
          token.id = listing.items.find(item => item.clientId === f.client.client_id && !used.has(item.id))?.id;
          break;
        }
        case 'read': {
          const path = action.surface === 'rest' ? '/blyg/api/settings' : f.issuer + '/oauth2/userinfo';
          observe('grant receiving ' + action.surface, (await f.request(path, { headers: { Authorization: 'Bearer ' + grants.get(action.grant)!.access_token } })).status); break;
        }
        case 'list': {
          const listing = await (await f.request('/blyg/api/authorizations', { headers: { cookie: f.owner } })).json() as { items: { id: string; clientId: string; scope: string[] }[] };
          const items = listing.items.filter(item => item.clientId === f.client.client_id);
          const draftGrant = action.draftGrant;
          const selected = draftGrant ? items.find(item => item.id === grants.get(draftGrant)?.id) : undefined;
          observe('grant owner listing', { count: items.length, selectedDraftGrant: draftGrant ? !!selected?.scope.includes('owner:draft') : true }); break;
        }
        case 'revoke': {
          const grant = grants.get(action.grant)!;
          observe('grant revocation', (await f.request('/blyg/api/authorizations/' + encodeURIComponent(grant.id ?? 'missing-grant'), { method: 'DELETE', headers: { cookie: f.owner } })).status); break;
        }
        case 'refresh': observe('grant refresh', (await f.request(f.issuer + '/oauth2/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', client_id: f.client.client_id, refresh_token: grants.get(action.grant)!.refresh_token, resource: f.base + '/blyg/api' }) })).status); break;
        case 'silent': {
          const url = new URL(f.authorize); url.searchParams.set('prompt', 'none');
          const response = await f.request(url.href, { headers: { cookie: f.owner } });
          const query = new URL(response.headers.get('location')!).searchParams;
          const code = query.get('code');
          observe('grant noninteractive authorization', { status: response.status, code: code === null ? null : code ? 'present' : '', error: query.get('error') }); break;
        }
      }
    }
  });
  observe('grant receiving complete', true);
}
oracleProperty({
  id: 'oauth-grant-list', owns: ['src/authorization-api.ts', 'src/oauth-routes.ts', 'src/oauth.ts#revokeGrant'],
  law: { statement: 'For every serial approval and owner-revocation history, each live grant is listed, revoking a grant denies its receiving access and remembered consent, and a sibling retains its access and refresh authority.', authority: 'Decision #52; docs/client-access.md; OIDC Core §3.1.2.1 and UserInfo', limits: 'Three original serial same-client histories; no arbitrary list-page or refresh-replay-family claim.' },
  histories, label: plan => plan.name, model, driver,
  check: (_plan, trace, expected) => {
    const entries = trace.filter(entry => entry.checkpoint !== 'grant receiving complete');
    for (let index = 0; index < entries.length; index++) { const result = differs(entries[index].checkpoint, 'independent grant authority', entries[index], expected[index]); if (result) return result; }
    return trace.some(entry => entry.checkpoint === 'grant receiving complete') ? differs('grant receiving completeness', 'independent grant authority', entries.length, expected.length) ?? pass : pass;
  },
  calibrations: [{ name: 'revoked access remains usable', law: 'independent grant authority', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'grant receiving rest' && entry.value === 401 ? { ...entry, value: 200 } : entry) }],
});
