// Scoring a track record. Probabilities and rankings are scored separately,
// as agreed: they answer different questions and don't share a scale.
//
//   Probability forecasts: every yes/no claim, and every outcome of a list
//     claim that has percentages (a list is a bundle of yes/no forecasts, one
//     per outcome, as prediction markets run them). Brier score: mean of
//     (p − outcome)², 0 is perfect, 0.25 is always saying 50%.
//   Rankings: list claims without percentages. Share of the predicted top
//     places that came true (for "pick one", 1 if the first choice won).
//   Ranges: share of "how much" claims whose range held the real number,
//     against the confidence the writer stated.
//
// Void claims are left out; "just record it" claims are never scored.

import { shapeOf } from './shapes.ts';
import type { ClaimBlock, ResolutionBlock } from './types.ts';

export interface Forecast {
  p: number;
  hit: boolean;
}

export interface Scored {
  forecasts: Forecast[];
  rankings: number[];
  ranges: { hit: boolean; confidence: number }[];
}

/** What one resolved claim contributes. Empty when void or unscored. */
export function scoreClaim(claim: ClaimBlock, r: ResolutionBlock): Scored {
  const out: Scored = { forecasts: [], rankings: [], ranges: [] };
  const o = r.outcome;
  if (o === 'void') return out;
  const shape = shapeOf(claim);
  if (shape === 'binary' && typeof o === 'boolean' && typeof claim.probability === 'number') {
    out.forecasts.push({ p: claim.probability, hit: o });
  }
  if (shape === 'quantity' && typeof o === 'number' && claim.range) {
    out.ranges.push({ hit: o >= claim.range[0] && o <= claim.range[1], confidence: claim.confidence ?? 0 });
  }
  if (shape === 'choice') {
    const actual = Array.isArray(o) ? o : typeof o === 'string' ? [o] : [];
    const outcomes = claim.outcomes ?? [];
    const withP = claim.pick !== 'order' && outcomes.length > 0 && outcomes.every((x) => typeof x.probability === 'number');
    if (withP) {
      for (const x of outcomes) out.forecasts.push({ p: x.probability!, hit: actual.includes(x.label) });
    } else if (actual.length) {
      const k = claim.pick === 'one' ? 1 : claim.size ?? actual.length;
      const predicted = outcomes.slice(0, k).map((x) => x.label);
      const top = actual.slice(0, k);
      const right = claim.pick === 'order' ? predicted.filter((l, i) => top[i] === l).length : predicted.filter((l) => top.includes(l)).length;
      out.rankings.push(right / k);
    }
  }
  return out;
}

export interface Summary {
  forecasts: number;
  brier: number | null;
  rankings: number;
  rankingAccuracy: number | null;
  ranges: number;
  rangeHits: number | null;
  rangeConfidence: number | null;
  /** Ten bins by stated probability: mean stated, share that happened, count. */
  calibration: { bin: number; stated: number; observed: number; n: number }[];
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function summarize(parts: Scored[]): Summary {
  const forecasts = parts.flatMap((p) => p.forecasts);
  const rankings = parts.flatMap((p) => p.rankings);
  const ranges = parts.flatMap((p) => p.ranges);
  const bins = new Map<number, Forecast[]>();
  for (const f of forecasts) {
    const b = Math.min(9, Math.floor(f.p * 10));
    bins.set(b, [...(bins.get(b) ?? []), f]);
  }
  return {
    forecasts: forecasts.length,
    brier: mean(forecasts.map((f) => (f.p - (f.hit ? 1 : 0)) ** 2)),
    rankings: rankings.length,
    rankingAccuracy: mean(rankings),
    ranges: ranges.length,
    rangeHits: mean(ranges.map((r) => (r.hit ? 1 : 0))),
    rangeConfidence: mean(ranges.map((r) => r.confidence)),
    calibration: [...bins].sort((a, b) => a[0] - b[0]).map(([bin, fs]) => ({
      bin,
      stated: mean(fs.map((f) => f.p))!,
      observed: mean(fs.map((f) => (f.hit ? 1 : 0)))!,
      n: fs.length,
    })),
  };
}

/** A plain reading of a Brier score. */
export function brierWords(b: number): string {
  if (b < 0.1) return 'sharp and well calibrated';
  if (b < 0.2) return 'better than a coin flip';
  if (b <= 0.25) return 'about as good as always saying 50%';
  return 'worse than always saying 50%';
}
