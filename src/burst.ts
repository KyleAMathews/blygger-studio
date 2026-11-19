/*
 * One authoring act, many items (spec §13.7's fold, decision #78): a thread
 * version and the items from its own blyg that it is the first to name, first
 * published within BURST_WINDOW_MS before it. The publisher sends the parts
 * first and the thread last (§7). One definition for both places that fold:
 * the public pace-layered order (RFC-3 R3, src/feeds/pace-layered.ts) and the
 * reader's Background (blygger-spec docs/background-plan.md, `burst`).
 */

/** A reference constant, as RFC-3's are: never on the wire or in a public API. */
export const BURST_WINDOW_MS = 15 * 60 * 1000;

/** Whether an item first published at `memberMs` belongs to the burst of a thread version published at `threadMs`. */
export function withinBurst(memberMs: number, threadMs: number): boolean {
  return Number.isFinite(memberMs) && Number.isFinite(threadMs) && memberMs <= threadMs && threadMs - memberMs <= BURST_WINDOW_MS;
}

/**
 * The window for an item a thread names by link rather than quote (session 74,
 * Venkat: placeholders only). A `[[+ text]]` placeholder is published seconds
 * before its thread, in the same publish; a chapter a contents thread links was
 * usually published minutes earlier and should stay its own arrival. Nothing on
 * the wire marks a placeholder, so the reader goes by time.
 */
export const LINK_BURST_WINDOW_MS = 2 * 60 * 1000;

/** `withinBurst` for an item named by link: the same publish, not the same quarter hour. */
export function withinLinkBurst(memberMs: number, threadMs: number): boolean {
  return withinBurst(memberMs, threadMs) && threadMs - memberMs <= LINK_BURST_WINDOW_MS;
}

/**
 * A publisher's own timestamp, clamped to when this reader first saw it, so a
 * future-dated item cannot pull a blyg's history into a burst (plan §2).
 */
export function clampedTime(asserted: string | null | undefined, observed: string | null | undefined): number {
  const a = asserted ? Date.parse(asserted) : NaN;
  const o = observed ? Date.parse(observed) : NaN;
  if (Number.isNaN(a)) return o;
  if (Number.isNaN(o)) return a;
  return Math.min(a, o);
}
