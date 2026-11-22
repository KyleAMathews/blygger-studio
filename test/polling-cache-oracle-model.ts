/** Independent reference for the polling/cache contract in
 * docs/d1-polling-cache-design.md. No production dependency classifier, cursor
 * reducer, SQL trigger or renderer is imported to predict an answer.
 *
 * Source facts, applied data and saved artifacts are distinct: a later load,
 * failed acknowledgment, or competing publication distinguishes each pair.
 * Epoch distinguishes restored counter reuse. Time is separate because passing
 * a deadline changes scheduled work without changing source revisions.
 * Histories can serve any saved legal snapshot; SWR promises no maximum age.
 * A successful publisher cannot lower generation within the same epoch.
 */
export const oracleDomains = ['items', 'reading', 'subscriptions', 'hoppers', 'signals', 'settings', 'feed', 'mentions', 'responses', 'interactions', 'browse', 'shelf', 'marks'] as const;
export type OracleDomain = typeof oracleDomains[number];
export type OracleToken = { epoch: string; domains: Record<OracleDomain, number> };
export function changedDomains(before: OracleToken, after: OracleToken) {
  return oracleDomains.filter(d => before.epoch !== after.epoch || before.domains[d] !== after.domains[d]);
}
/** Source identity and accepted representation stay distinct. The validator is
 * opaque: equality permits reuse only with the body received under that tag. */
export class StudioQueryReference {
  readonly fetched = new Map<string, { etag: string; value: number }>();
  needsFetch(key: string, source: { etag: string }) {
    return this.fetched.get(key)?.etag !== source.etag;
  }
  receive(key: string, source: { etag: string; value: number }) {
    const prior = this.fetched.get(key);
    if (prior?.etag === source.etag && prior.value !== source.value)
      throw new Error('one validator names different representations');
    this.fetched.set(key, { ...source });
  }
}
export type FeedFacts = { title: string; bio: string; body: string };
export class FeedReference {
  history: FeedFacts[] = [];
  readonly generations = new Map<string, FeedFacts>();
  commit(facts: FeedFacts, generation?: { epoch: string; revision: number }) {
    this.history.push({ ...facts });
    if (generation) this.generations.set(`${generation.epoch}:${generation.revision}`, { ...facts });
  }
  at(generation: { epoch: string; revision: number }) { return this.generations.get(`${generation.epoch}:${generation.revision}`); }
  legal(facts: FeedFacts) {
    return this.history.some(s => s.title === facts.title && s.bio === facts.bio && s.body === facts.body);
  }
}
