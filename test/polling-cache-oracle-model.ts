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
export const oracleDomains = ['items', 'reading', 'subscriptions', 'hoppers', 'signals', 'settings', 'feed'] as const;
export type OracleDomain = typeof oracleDomains[number];
export type OracleToken = { epoch: string; domains: Record<OracleDomain, number> };
export function changedDomains(before: OracleToken, after: OracleToken) {
  return oracleDomains.filter(d => before.epoch !== after.epoch || before.domains[d] !== after.domains[d]);
}
export class StudioReference {
  readonly installed = new Map<string, number>();
  readonly applied = new Map<string, { epoch: string; revision: number }>();
  acknowledge(view: string, target: { epoch: string; revision: number }, installed: number | null, source = installed) {
    if (installed === null) return;
    if (installed < target.revision) throw new Error('acknowledged data older than target');
    if (source === null || installed > source) throw new Error('installed data absent from source');
    this.installed.set(view, installed);
    this.applied.set(view, { ...target });
  }
  dirty(view: string, source: { epoch: string; revision: number }) {
    const applied = this.applied.get(view);
    return !applied || applied.epoch !== source.epoch || applied.revision !== source.revision;
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
