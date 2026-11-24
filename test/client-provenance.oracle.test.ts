/** Generation provenance is the server's: a client body that offers it is refused
 * whole, and a refused request changes no item field and creates no item.
 * The REST receiving boundary owns create/update/publish and the public document.
 *
 * POST /blyg/api/items({contentMd: twoTkSpans, provenance: [claim, null]}) // → 400, no item
 * PATCH /blyg/api/items/id({contentMd: more, provenance: [claim]}) // → 400, unchanged draft
 * POST /blyg/api/items/id/publish // → generated words, no claims the client wrote
 *
 * Until contract 7.0.0 a client could record provenance positionally. The
 * private-taint ruling (Venkat Rao, 2026-11-24, studio#178 Q1) made the server
 * its only writer: a client-written `private` mark could be cleared, and a
 * client-written source list could name an id that does not exist or probe
 * whether one is private. Text generated elsewhere is marked in the text
 * instead, `[TK]impyrt=…[/TK]` (decision #37). Decision #52 and §5.9 still
 * require a refused patch to persist nothing, so the atomic half is kept.
 * For every modeled history, a create or patch that offers provenance is
 * refused, no item field changes and no item is created; publication of
 * hand-written TK output carries no claims and keeps the words without the
 * private TK delimiters.
 *
 * The model counts the plan's patches, never production parsing. Histories
 * carry prompts, generated words and claims; no history supplies expected
 * answers. The driver records HTTP statuses, the before/after equality relation,
 * the item count and the public document's claims/text. Equality is observed
 * without logging random IDs or timestamps.
 * Limits: one two-span REST history; MCP parity has its own oracle.
 */
import { differs, oracleProperty, pass } from '@tanstack/oracles';
import { equals, iterableEquality } from '@vitest/expect';
import { SELF } from 'cloudflare:test';
import { BASE, STUDIO, testRevisionBody } from './helpers.ts';
import { withOracleStorage } from './oracle-storage.ts';

type Claim = { sources: never[]; model: string; at: string };
type History = { name: string; spans: { prompt: string; text: string }[]; claim: Claim; initial: (0 | null)[]; patches: { append?: string; claims: (0 | null)[] }[] };
const histories: History[] = [{
  name: 'refuses client provenance whole: on create, and on a patch with or without text, aligned or not',
  spans: [{ prompt: 'first', text: 'First generated sentence.' }, { prompt: 'second', text: 'Second generated sentence.' }],
  claim: { sources: [], model: 'oracle-agent', at: '2026-10-04T00:00:00Z' },
  initial: [0, null], patches: [{ append: '\nMust not persist.', claims: [0] }, { claims: [0, 0] }],
}];
// Every offer of provenance is refused whole; a refused patch leaves every field as it was.
function model(history: History) {
  return { creation: 400, patches: history.patches.map(() => ({ status: 400, unchanged: true })), claims: 0 };
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
    const count = async () => ((await (await request('/blyg/api/items/summary')).json()) as { all: number }).all;
    const itemsBefore = await count();
    const creation = await request('/blyg/api/items', 'POST', { contentMd: text, provenance: claims(history.initial) });
    observe('client provenance creation', { status: creation.status, created: (await count()) !== itemsBefore });
    const draft = await (await request('/blyg/api/items', 'POST', { contentMd: text })).json() as { id: string };
    for (let index = 0; index < history.patches.length; index++) {
      const patch = history.patches[index];
      const before = await (await request('/blyg/api/items/' + draft.id)).json();
      const response = await request('/blyg/api/items/' + draft.id, 'PATCH', { ...(patch.append === undefined ? {} : { contentMd: text + patch.append }), provenance: claims(patch.claims) });
      observe('client provenance refusal', response.status);
      const after = await (await request('/blyg/api/items/' + draft.id)).json();
      observe('client provenance atomic rejection', equals(after, before, [iterableEquality]));
    }
    observe('client provenance publication', (await request('/blyg/api/items/' + draft.id + '/publish', 'POST', {})).status);
    const document = await (await SELF.fetch(BASE + '/blyg/items/' + draft.id + '.json')).json() as { generated: unknown; content_md: string };
    observe('client provenance public claims', Array.isArray(document.generated) ? document.generated.length : 0);
    observe('client provenance public words', { words: history.spans.map(span => document.content_md.includes(span.text)), tkDelimiters: document.content_md.includes('[TK]') });
  });
  observe('client provenance completed', true);
}
oracleProperty({
  id: 'client-provenance',
  owns: ['src/api.ts#updateItemOperation', 'src/api.ts#createItemOperation'],
  law: { statement: 'For every modeled history, a create or patch that offers generation provenance is refused, no item field changes and no item is created, and publication of hand-written TK output carries no claims and keeps its words without TK delimiters.', authority: 'Decision by Venkat Rao (GitHub vgururao), 2026-11-24, studio#178 Q1: only the server writes provenance; blygger-spec docs/sealed-content-build-plan.md §1 0f law 4. Decision #52 and AGENTS.md §5.9 for whole-request refusal. Decision #37 for impyrt.', limits: 'One two-span REST history; MCP parity has its own oracle. Server-written provenance is the private-scope and TK oracles\' concern.' },
  histories, label: history => history.name, model, driver,
  check: (history, trace, expected) => {
    const checks: [string, unknown][] = [['owner fixture login', 302], ['client provenance creation', { status: expected.creation, created: false }]];
    history.patches.forEach((_patch, index) => { checks.push(['client provenance refusal', expected.patches[index].status], ['client provenance atomic rejection', expected.patches[index].unchanged]); });
    checks.push(['client provenance publication', 200], ['client provenance public claims', expected.claims], ['client provenance public words', { words: history.spans.map(() => true), tkDelimiters: false }]);
    const actual = trace.filter(entry => entry.checkpoint !== 'client provenance completed');
    for (let index = 0; index < actual.length; index++) { const [checkpoint, expectedValue] = checks[index] ?? ['unexpected observation', undefined]; const mismatch = differs(checkpoint, 'server provenance', actual[index], { checkpoint, value: expectedValue }); if (mismatch) return mismatch; }
    return trace.some(entry => entry.checkpoint === 'client provenance completed') ? differs('client provenance completion', 'server provenance', actual.length, checks.length) ?? pass : pass;
  },
  calibrations: [{ name: 'invalid patch persists text', law: 'server provenance', history: { enumerated: 0 }, corrupt: trace => trace.map(entry => entry.checkpoint === 'client provenance atomic rejection' ? { ...entry, value: false } : entry) }],
});
