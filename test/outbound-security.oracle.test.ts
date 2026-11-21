/** This oracle owns streaming byte limits on Webmention and importer readers,
 * checked when boundedText/text settles and the producer's work is observable.
 *
 * ```ts
 * boundedText(await mentionFetch(url)) // → null above 1 MiB; exact UTF-8 boundary survives
 * (await mentionFetch(url)).text() // → rejects above 1 MiB and cancels the producer
 * (await platformFetch(url)).text() // → 4 MiB accepted; next byte rejected
 * ```
 * Refusing after buffering an entire response misses the promised work bound.
 * For every finite reader/body plan, the byte cap decides content or refusal,
 * and an oversized stream consumes at most the cap plus one incoming chunk.
 * The model uses the client's documented 1/4 MiB limits, independent of production
 * constants. The driver supplies real streams with no Content-Length, records
 * reader outcomes and pull/cancel counters, and restores fetch. A compact text
 * summary records length and every distinct code point; for these uniform-input
 * bodies it preserves exact equality without writing megabytes to the trace.
 * Limits: named local reader/chunk boundaries; no deployed memory/SSRF claim.
 */
import { differs, oracleProperty, pass, type Observation } from '@tanstack/oracles';
import { vi } from 'vitest';
import { mentionFetch, boundedText } from '../src/mentions/http.ts';
import { platformFetch } from '../src/importer/http.ts';
import { completed, outcome, receivingTrace } from './network-oracle-observations.ts';
type Body = { unit: string; repetitions: number; chunks: number };
type Plan = { name: string; reader: 'bounded' | 'mention-text' | 'import-text'; bodies: Body[]; streaming: boolean; url: string };
const mentionCap = 1024 * 1024, importerCap = 4 * 1024 * 1024;
const histories: Plan[] = [
  { name: 'cancels an undeclared oversized Webmention body before buffering the whole response', reader: 'bounded', bodies: [{ unit: 'a', repetitions: mentionCap / 2, chunks: 8 }], streaming: true, url: 'https://publisher.example/mention' },
  { name: 'retains a valid multibyte Webmention body at the byte boundary', reader: 'bounded', bodies: [{ unit: 'é', repetitions: mentionCap / 2, chunks: 1 }], streaming: false, url: 'https://publisher.example/mention' },
  { name: 'direct Webmention text readers cannot bypass the streaming byte cap', reader: 'mention-text', bodies: [{ unit: '\0', repetitions: mentionCap / 2, chunks: 8 }], streaming: true, url: 'https://publisher.example/' },
  { name: 'refuses one byte beyond the Webmention body boundary', reader: 'bounded', bodies: [{ unit: 'a', repetitions: mentionCap + 1, chunks: 1 }], streaming: false, url: 'https://publisher.example/mention' },
  { name: 'importer accepts exactly 4 MiB and refuses the next byte', reader: 'import-text', bodies: [{ unit: 'a', repetitions: importerCap, chunks: 1 }, { unit: 'a', repetitions: importerCap + 1, chunks: 1 }], streaming: false, url: 'https://publisher.example/feed' },
];
const summary = (text: string) => ({ length: text.length, characters: [...new Set(text)].sort() });
// A threshold over input bytes predicts content; producer-work allowance follows
// from whole incoming chunks, not the implementation's buffering algorithm.
function model(plan: Plan) {
  const cap = plan.reader === 'import-text' ? importerCap : mentionCap;
  return plan.bodies.map(body => {
    const chunkBytes = new TextEncoder().encode(body.unit).length * body.repetitions;
    const oversized = chunkBytes * body.chunks > cap;
    return { rejection: oversized && plan.reader !== 'bounded', content: oversized ? null : summary(body.unit.repeat(body.repetitions * body.chunks)), maxPulls: plan.streaming ? Math.min(body.chunks, Math.floor(cap / chunkBytes) + 1) : null, cancel: plan.streaming && oversized };
  });
}
oracleProperty({
  id: 'outbound-security', owns: ['src/mentions/http.ts'],
  law: { statement: 'For every bounded body/reader history, Webmention refuses above 1 MiB and importer above 4 MiB while exact-boundary content survives; oversized streams cancel after at most the cap plus one incoming chunk.', authority: 'v0.3-plan §2.3.5; documented src/mentions/http.ts fetch contract and docs/auth-deployment-hardening.md; existing streaming receiving laws', limits: 'Original five finite schedules, two importer byte neighbors and fixed chunks; local fetch seam, no deployed memory or network claim.' },
  histories, label: plan => plan.name, model,
  driver: (plan, observe) => completed(observe, async () => {
    for (const body of plan.bodies) {
      let pulls = 0, cancelled = false;
      const chunk = new TextEncoder().encode(body.unit.repeat(body.repetitions));
      const payload = plan.streaming ? new ReadableStream<Uint8Array>({ pull(controller) { pulls++; controller.enqueue(chunk); if (pulls === body.chunks) controller.close(); }, cancel() { cancelled = true; } }, { highWaterMark: 0 }) : body.unit.repeat(body.repetitions * body.chunks);
      const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => String(input).startsWith('https://cloudflare-dns.com/') ? Response.json({ Status: 0, Answer: [{ type: 1, data: '93.184.216.34' }] }) : new Response(payload));
      try {
        const result = await outcome(async () => {
          const response = await (plan.reader === 'import-text' ? platformFetch : mentionFetch)(plan.url);
          const text = plan.reader === 'bounded' ? await boundedText(response) : await response.text();
          return text === null ? null : summary(text);
        });
        observe('body reader settled', { result, pulls, cancelled });
      } finally { spy.mockRestore(); }
    }
  }),
  check: (_plan, rawTrace, expected) => {
    const { observations: trace, complete } = receivingTrace(rawTrace);
    const length = differs(trace[expected.length]?.checkpoint ?? 'body reader count', 'bounded outbound body', trace.length, complete ? expected.length : Math.min(trace.length, expected.length)); if (length) return length;
    for (let index = 0; index < trace.length; index++) {
      // Work and cancellation belong to this settled reader observation too.
      const entry = trace[index], wanted = expected[index], actual = entry.value as { result: Awaited<ReturnType<typeof outcome>>; pulls: number; cancelled: boolean };
      const projected = actual.result.kind === 'threw' ? { rejection: true, message: /body exceeds/i.test(actual.result.message), content: null } : { rejection: false, message: true, content: actual.result.value };
      const result = differs(entry.checkpoint, 'bounded outbound body', projected, { rejection: wanted.rejection, message: true, content: wanted.content })
        ?? (wanted.maxPulls === null ? undefined : differs(entry.checkpoint, 'bounded outbound body', actual.pulls <= wanted.maxPulls, true))
        ?? (wanted.maxPulls === null ? undefined : differs(entry.checkpoint, 'bounded outbound body', actual.cancelled, wanted.cancel));
      if (result) return result;
    }
    return pass;
  },
  calibrations: [{ name: 'oversized stream accepted', law: 'bounded outbound body', history: { enumerated: 0 }, corrupt: (trace: readonly Observation[]) => trace.map(entry => entry.checkpoint !== 'body reader settled' ? entry : ({ ...entry, value: { ...(entry.value as object), result: { kind: 'returned', value: { length: 8 * mentionCap / 2, characters: ['a'] } } } })) }],
});
