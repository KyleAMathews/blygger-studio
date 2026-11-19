/** Client provenance stays positional and a rejected patch changes no item field.
 * The REST receiving boundary owns create/update/publish and the public document.
 *
 * POST /blyg/api/items({contentMd: twoTkSpans, provenance: [claim, null]}) // → draft
 * PATCH /blyg/api/items/id({provenance: [claim]}) // → 400, unchanged draft
 * POST /blyg/api/items/id/publish // → aligned claims and generated words
 *
 * A patch can contain both valid text and an invalid claim count. Decision #52
 * and §5.9 require the entire patch to refuse rather than persist half of it.
 * For every modeled span/claim history, accepted claims have one position per TK
 * span and a mismatched patch preserves every item field. Publication retains the
 * accepted claims and generated words, while removing the private TK delimiters.
 *
 * The model counts the plan's spans, never production parsing. Histories carry
 * prompts, generated words and claims; no history supplies expected answers.
 * The driver records HTTP statuses, the before/after equality relation and the
 * public document's claims/text. Equality is observed without logging random IDs
 * or timestamps. Comparisons happen at each completed receiving response.
 * Limits: the original two-span REST witness; MCP parity has its own oracle.
 */
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { equals, iterableEquality } from '@vitest/expect';
import { SELF } from 'cloudflare:test';
import { BASE, STUDIO, testRevisionBody } from './helpers.ts';
import { withOracleStorage } from './oracle-storage.ts';

type Claim = { sources: never[]; model: string; at: string };
type History = { name: string; spans: { prompt: string; text: string }[]; claim: Claim; initial: (0 | null)[]; patches: { append?: string; claims: (0 | null)[] }[] };
const histories: History[] = [{
  name: 'keeps client claims aligned to generated spans and rejects a partial patch atomically',
  spans: [{ prompt: 'first', text: 'First generated sentence.' }, { prompt: 'second', text: 'Second generated sentence.' }],
  claim: { sources: [], model: 'oracle-agent', at: '2026-10-04T00:00:00Z' },
  initial: [0, null], patches: [{ append: '\nMust not persist.', claims: [0] }, { claims: [0, 0] }],
}];
// Positional alignment is a count law. A refused patch leaves both text and
// claims at their previous values; the accepted patch replaces only its claims.
function model(history: History) {
  let claims = history.initial.map(value => value === null ? null : history.claim);
  const patches = history.patches.map(patch => {
    const aligned = patch.claims.length === history.spans.length;
    if (aligned) { claims = patch.claims.map(value => value === null ? null : history.claim); }
    return { status: aligned ? 200 : 400, unchanged: !aligned };
  });
  return { creation: history.initial.length === history.spans.length ? 201 : 400, patches, claims };
}
async function driver(history: History, observe: (checkpoint: string, value: unknown) => void) {
  await withOracleStorage(async () => {
    const ip = '2001:db8:b003:1::1';
    const login = await SELF.fetch(BASE + STUDIO + '/login', { method: 'POST', redirect: 'manual', headers: { 'cf-connecting-ip': ip }, body: new URLSearchParams({ password: 'test-password' }) });
    observe('owner fixture login', login.status);
    const cookieHeader = login.headers.get('set-cookie');
    if (!cookieHeader) throw new Error('Client provenance fixture login supplied no owner cookie');
    const cookie = cookieHeader.split(';')[0];
    const request = async (path: string, method = 'GET', body?: unknown) => {
      body = await testRevisionBody(method, path, body);
      return SELF.fetch(BASE + path, { method, headers: { cookie, 'cf-connecting-ip': ip, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    };
    const text = history.spans.map(span => `[TK]${span.prompt}[=]${span.text}[/TK]`).join('\n\n');
    const claims = (positions: (0 | null)[]) => positions.map(value => value === null ? null : history.claim);
    const creation = await request('/blyg/api/items', 'POST', { contentMd: text, provenance: claims(history.initial) });
    observe('client provenance creation', creation.status);
    const draft = await creation.json() as { id: string };
    for (let index = 0; index < history.patches.length; index++) {
      const patch = history.patches[index];
      const before = await (await request('/blyg/api/items/' + draft.id)).json();
      const response = await request('/blyg/api/items/' + draft.id, 'PATCH', { ...(patch.append === undefined ? {} : { contentMd: text + patch.append }), provenance: claims(patch.claims) });
      observe(index === 0 ? 'client provenance alignment rejection' : 'client provenance aligned patch', response.status);
      const after = await (await request('/blyg/api/items/' + draft.id)).json();
      if (patch.append !== undefined) observe('client provenance atomic rejection', equals(after, before, [iterableEquality]));
    }
    observe('client provenance publication', (await request('/blyg/api/items/' + draft.id + '/publish', 'POST', {})).status);
    const document = await (await SELF.fetch(BASE + '/blyg/items/' + draft.id + '.json')).json() as { generated: unknown; content_md: string };
    observe('client provenance public claims', document.generated);
    observe('client provenance public words', { words: history.spans.map(span => document.content_md.includes(span.text)), tkDelimiters: document.content_md.includes('[TK]') });
  });
  observe('client provenance completed', true);
}
oracleProperty({
  id: 'client-provenance',
  owns: ['src/api.ts#updateItemOperation', 'src/api.ts#createItemOperation'],
  law: { statement: 'For every modeled generated-span history, claim counts align positionally, a refused patch preserves every item field, and publication exposes the accepted claims and generated words without TK delimiters.', authority: 'Decision #52; AGENTS.md §5.9; docs/auth-oracles.md client-recorded generation provenance; original client-provenance receiving witness.', limits: 'The complete original two-span REST history; this checks alignment, not whether client attribution is truthful, and does not infer MCP parity.' },
  histories, label: history => history.name, model, driver,
  check: (history, trace, expected) => {
    const checks: [string, unknown][] = [['owner fixture login', 302], ['client provenance creation', expected.creation]];
    history.patches.forEach((patch, index) => { checks.push([index === 0 ? 'client provenance alignment rejection' : 'client provenance aligned patch', expected.patches[index].status]); if (patch.append !== undefined) checks.push(['client provenance atomic rejection', expected.patches[index].unchanged]); });
    checks.push(['client provenance publication', 200], ['client provenance public claims', expected.claims], ['client provenance public words', { words: history.spans.map(() => true), tkDelimiters: false }]);
    const actual = trace.filter(entry => entry.checkpoint !== 'client provenance completed');
    for (let index = 0; index < actual.length; index++) { const [checkpoint, expectedValue] = checks[index] ?? ['unexpected observation', undefined]; const mismatch = differs(checkpoint, 'client provenance alignment', actual[index], { checkpoint, value: expectedValue }); if (mismatch) return mismatch; }
    return trace.some(entry => entry.checkpoint === 'client provenance completed') ? differs('client provenance completion', 'client provenance alignment', actual.length, checks.length) ?? pass : pass;
  },
  calibrations: [{ name: 'invalid patch persists text', law: 'client provenance alignment', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'client provenance atomic rejection' ? { ...entry, value: false } : entry) }],
});
