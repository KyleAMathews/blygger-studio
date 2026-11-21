/** Independent MCP receiving contract. The plan selects mount, wire version and
 * receiving boundary; it never contains expected replies. This model has no
 * production imports. Its capability rule is the existing independent literal
 * verb/scope union, and its transport rules come from the cited MCP contract.
 *
 * The model's rules apply at semantic response checkpoints across every retained
 * mount/version row. The count map makes omissions observable after completion;
 * a prefix cut short by a fixture error is judged only on recorded observations.
 * Opaque credential identity and REST/MCP projection equality are observed as
 * relations so the determinism trace does not publish credentials or random IDs.
 */
import { differs, type Observation } from '@tanstack/oracles';
import { equals, iterableEquality, subsetEquality } from '@vitest/expect';
import { all, expectedTools } from './mcp-oracle-model.ts';
export type McpBoundary = 'confidential-oauth' | 'protocol-handshake' | 'oauth-discovery' | 'scope-inventory' | 'mention-projections' | 'item-publication' | 'scope-challenges' | 'request-authority' | 'protocol-classification' | 'access-expiry' | 'message-classification';
export type McpPlan = { name: string; boundary: McpBoundary; mount: string; version?: string; publication?: { contentMd: string; generatedText: string; provenance: { sources: never[]; model: string }[] } };
type Rule = { kind: 'exact' | 'not' | 'contains' | 'not-contains' | 'subset' | 'member' | 'sequence' | 'thrown'; value?: unknown };
export function mcpReference(plan: McpPlan) {
 const base = 'https://mcp-oracle.example.test', mount = plan.mount;
 // Distinct response facts are kept because a legal receiving witness can
 // corrupt each independently: a valid status can still carry a wrong value.
 const rules: Record<string, Rule> = {
  "owner login": { kind: "exact", value: 302 },
  "manual MCP issuance": { kind: "exact", value: 200 },
  "MCP tool error flag": { kind: "not", value: true },
  "confidential registration": { kind: "exact", value: 201 },
  "confidential token authentication": { kind: "exact", value: 'client_secret_basic' },
  "confidential client secret presence": { kind: "exact", value: true },
  "OAuth login redirect": { kind: "exact", value: 302 },
  "default MCP resource": { kind: "exact", value: base + mount + '/studio/mcp' },
  "OAuth consent": { kind: "exact", value: 200 },
  "consent resource disclosure": { kind: "exact", value: true },
  "OAuth consent decision": { kind: "exact", value: 302 },
  "OAuth callback destination": { kind: "exact", value: 'https://oauth-callbacks.cloudflareaccess.com/cdn-cgi/access/outbound-oauth-callback' },
  "OAuth callback state": { kind: "exact", value: 'portal-state' },
  "OAuth code exchange": { kind: "exact", value: 200 },
  "refresh credential presence": { kind: "exact", value: true },
  "MCP token receiving": { kind: "exact", value: 200 },
  "MCP settings presence": { kind: "exact", value: true },
  "API audience refusal": { kind: "exact", value: 401 },
  "refresh audience widening": { kind: "exact", value: 400 },
  "refresh audience error": { kind: "subset", value: { error: 'invalid_target' } },
  "MCP refresh exchange": { kind: "exact", value: 200 },
  "refresh credential rotation": { kind: "exact", value: false },
  "MCP successor receiving": { kind: "exact", value: 200 },
  "API successor audience refusal": { kind: "exact", value: 401 },
  "protocol response": { kind: "exact", value: 200 },
  "protocol message cardinality": { kind: "exact", value: 1 },
  "protocol error absence": { kind: "exact" },
  "negotiated protocol version": { kind: "exact", value: plan.version },
  "protocol tools capability": { kind: "exact", value: true },
  "initialized notification": { kind: "exact", value: 202 },
  "read-scope protocol inventory": { kind: "exact", value: expectedTools(['owner:read']) },
  "protocol settings presence": { kind: "exact", value: true },
  "OAuth authorization redirect presence": { kind: "exact", value: true },
  "OAuth discovery consent decision": { kind: "exact", value: 302 },
  "OAuth discovery callback state": { kind: "exact", value: 'oracle-state' },
  "MCP OAuth real tool call": { kind: "exact", value: true },
  "MCP discovery authorization-server fallback": { kind: "member", value: { path: '/.well-known/oauth-authorization-server' + mount + '/studio/auth', status: 404 } },
  "MCP discovery OIDC fallback": { kind: "member", value: { path: '/.well-known/openid-configuration' + mount + '/studio/auth', status: 404 } },
  "MCP mounted discovery": { kind: "member", value: { path: mount + '/studio/auth/.well-known/openid-configuration', status: 200 } },
  "MCP scope capabilities": { kind: "sequence", value: Array.from({length: (1 << all.length) - 1}, (_, index) => { const scope = all.filter((_, bit) => (index + 1) & (1 << bit)); return { scope, tools: expectedTools(scope) }; }) },
  "MCP REST mention projection": { kind: "exact", value: true },
  "MCP mention scope denial": { kind: "exact", value: 403 },
  "MCP REST item equivalence": { kind: "exact", value: true },
  "MCP generation provenance retained": { kind: "exact", value: plan.publication?.provenance },
  "MCP public generated provenance": { kind: "exact", value: plan.publication?.provenance },
  "MCP public generated words": { kind: "contains", value: plan.publication?.generatedText },
  "MCP public TK syntax": { kind: "not-contains", value: '[TK]' },
  "MCP grant revocation": { kind: "exact", value: 200 },
  "MCP revoked tool outcome": { kind: "thrown" },
  "MCP publish scope denial": { kind: "exact", value: 403 },
  "MCP insufficient scope challenge": { kind: "contains", value: 'error="insufficient_scope"' },
  "MCP required publish scope": { kind: "contains", value: 'scope="owner:publish"' },
  "MCP challenge metadata": { kind: "contains", value: base + mount + '/studio/auth/resources/mcp' },
  "MCP response edit denial": { kind: "exact", value: 403 },
  "MCP required public edit scopes": { kind: "contains", value: 'scope="owner:draft owner:publish"' },
  "MCP highlight denial": { kind: "exact", value: 403 },
  "MCP read neighbor": { kind: "exact", value: 200 },
  "MCP read neighbor error flag": { kind: "not", value: true },
  "MCP no-origin neighbor": { kind: "exact", value: 200 },
  "MCP same-origin neighbor": { kind: "exact", value: 200 },
  "MCP foreign-origin denial": { kind: "exact", value: 403 },
  "MCP invalid bearer denial": { kind: "exact", value: 401 },
  "MCP invalid bearer challenge": { kind: "contains", value: '/studio/auth/resources/mcp' },
  "MCP independent concurrent authority": { kind: "exact", value: [200, 403] },
  "MCP modern protocol neighbor": { kind: "exact", value: 200 },
  "MCP contradictory header denial": { kind: "exact", value: 400 },
  "MCP contradictory header error": { kind: "exact", value: -32020 },
  "MCP missing header denial": { kind: "exact", value: 400 },
  "MCP missing header error": { kind: "exact", value: -32020 },
  "MCP unsupported version denial": { kind: "exact", value: 400 },
  "MCP supported-version disclosure": { kind: "contains", value: '2026-07-28' },
  "MCP unknown method denial": { kind: "exact", value: 404 },
  "MCP unknown method error": { kind: "exact", value: -32601 },
  "MCP resource identity": { kind: "exact", value: base + mount + '/studio/mcp' },
  "MCP authorization servers": { kind: "exact", value: [base + mount + '/studio/auth'] },
  "MCP access scopes": { kind: "not-contains", value: 'offline_access' },
  "OIDC issuer": { kind: "exact", value: base + mount + '/studio/auth' },
  "OIDC S256 methods": { kind: "exact", value: ['S256'] },
  "OIDC issuer parameter": { kind: "exact", value: true },
  "MCP wrong HTTP method": { kind: "exact", value: 405 },
  "MCP expiry consent": { kind: "exact", value: 302 },
  "MCP expiry exchange": { kind: "exact", value: 200 },
  "MCP access lifetime": { kind: "exact", value: 3600 },
  "MCP expiry API audience denial": { kind: "exact", value: 401 },
  "MCP initial access": { kind: "exact", value: 200 },
  "MCP access before expiry": { kind: "exact", value: 200 },
  "MCP exact expiry denial": { kind: "exact", value: 401 },
  "MCP expiry challenge": { kind: "contains", value: '/studio/auth/resources/mcp' },
  "MCP notification status": { kind: "exact", value: 202 },
  "MCP notification body": { kind: "exact", value: '' },
  "MCP invalid message body": { kind: "exact", value: 400 },
 };
 const counts: Record<string, number> = {};
 const add = (names: string[], times = 1) => { for (const name of names) counts[name] = (counts[name] ?? 0) + times; };
 // Each branch describes a receiving operation family, not a test title or ID.
 switch (plan.boundary) {
 case "confidential-oauth":
  add(["owner login","MCP tool error flag"]);
  add(["confidential registration","confidential token authentication","confidential client secret presence","OAuth login redirect","default MCP resource","OAuth consent","consent resource disclosure","OAuth consent decision","OAuth callback destination","OAuth callback state","OAuth code exchange","refresh credential presence","MCP token receiving","MCP settings presence","API audience refusal","refresh audience widening","refresh audience error","MCP refresh exchange","refresh credential rotation","MCP successor receiving","API successor audience refusal"]);
  break;
 case "protocol-handshake":
  add(["owner login","manual MCP issuance","MCP tool error flag"]);
  add(["protocol response","protocol message cardinality","protocol error absence"], 3);
  add(["negotiated protocol version","protocol tools capability","initialized notification","read-scope protocol inventory","protocol settings presence"]);
  break;
 case "oauth-discovery":
  add(["owner login","MCP tool error flag"]);
  add(["OAuth authorization redirect presence","OAuth discovery consent decision","OAuth discovery callback state","MCP OAuth real tool call","MCP discovery authorization-server fallback","MCP discovery OIDC fallback","MCP mounted discovery"]);
  break;
 case "scope-inventory":
  add(["owner login"]);
  add(["manual MCP issuance","MCP scope capabilities"], 31);
  break;
 case "mention-projections":
  add(["owner login"]);
  add(["manual MCP issuance","MCP tool error flag","MCP REST mention projection","MCP mention scope denial"], 2);
  break;
 case "item-publication":
  add(["owner login","manual MCP issuance"]);
  add(["MCP tool error flag"], 3);
  add(["MCP REST item equivalence","MCP generation provenance retained","MCP public generated provenance","MCP public generated words","MCP public TK syntax","MCP grant revocation","MCP revoked tool outcome"]);
  break;
 case "scope-challenges":
  add(["owner login"]);
  add(["manual MCP issuance"], 2);
  add(["MCP publish scope denial","MCP insufficient scope challenge","MCP required publish scope","MCP challenge metadata","MCP response edit denial","MCP required public edit scopes","MCP highlight denial","MCP read neighbor","MCP read neighbor error flag"]);
  break;
 case "request-authority":
  add(["owner login"]);
  add(["manual MCP issuance"], 2);
  add(["MCP no-origin neighbor","MCP same-origin neighbor","MCP foreign-origin denial"]);
  add(["MCP invalid bearer denial","MCP invalid bearer challenge"], 3);
  add(["MCP independent concurrent authority"]);
  break;
 case "protocol-classification":
  add(["owner login","manual MCP issuance","MCP modern protocol neighbor"]);
  add(["MCP contradictory header denial","MCP contradictory header error"], 4);
  add(["MCP missing header denial","MCP missing header error"], 3);
  add(["MCP unsupported version denial","MCP supported-version disclosure","MCP unknown method denial","MCP unknown method error","MCP resource identity","MCP authorization servers","MCP access scopes","OIDC issuer","OIDC S256 methods","OIDC issuer parameter","MCP wrong HTTP method"]);
  break;
 case "access-expiry":
  add(["MCP expiry consent","MCP expiry exchange","MCP access lifetime"], 2);
  add(["MCP expiry API audience denial","MCP initial access","MCP access before expiry","MCP exact expiry denial","MCP expiry challenge"]);
  break;
 case "message-classification":
  add(["owner login","manual MCP issuance","MCP notification status","MCP notification body"]);
  add(["MCP invalid message body"], 2);
  break;
 }
 return { rules, counts };
}
export function checkMcpObservation(entry: Observation, expected: ReturnType<typeof mcpReference>, ordinal = 0) {
 const rule = expected.rules[entry.checkpoint];
 if (!rule || !(entry.checkpoint in expected.counts)) return differs(entry.checkpoint, 'MCP receiving laws', 'unexpected checkpoint', 'a planned receiving observation');
 let actual = entry.value, wanted = rule.value;
 switch (rule.kind) {
  case 'exact': break;
  case 'not': actual = equals(actual, wanted, [iterableEquality]); wanted = false; break;
  case 'contains': actual = typeof actual === 'string' && typeof wanted === 'string' ? actual.includes(wanted) : Array.isArray(actual) && actual.includes(wanted); wanted = true; break;
  case 'not-contains': actual = typeof actual === 'string' && typeof wanted === 'string' ? actual.includes(wanted) : Array.isArray(actual) && actual.includes(wanted); wanted = false; break;
  case 'subset': actual = equals(actual, wanted, [iterableEquality, subsetEquality]); wanted = true; break;
  case 'member': actual = Array.isArray(actual) && actual.some(value => equals(value, wanted, [iterableEquality])); wanted = true; break;
  case 'sequence': wanted = (wanted as unknown[])[ordinal]; break;
  case 'thrown': actual = !!actual && typeof actual === 'object' && Object.hasOwn(actual, 'threw'); wanted = true; break;
 }
 return differs(entry.checkpoint, 'MCP receiving laws', actual, wanted);
}
