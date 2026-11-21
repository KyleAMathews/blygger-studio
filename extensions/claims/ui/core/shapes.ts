// Claim shapes. Structure is the price of being scored, and the writer chooses
// whether to pay it on each claim:
//
//   binary    Yes or no. One probability.
//   choice    From a list. `pick` is "one" (the winner), "set" (which ones make
//             it, `size` of them) or "order" (the top `size`, in order).
//             Percentages are optional: with them, a forecast; without, a
//             ranking. Rankings and probabilities are scored separately.
//   quantity  How much. A range, and how confident the writer is that the
//             true value falls inside it.
//   record    Just record it. Any statement, published and pinned, never scored.
//
// A claim with no `shape` and a `probability` is binary, so every claim
// written before shapes existed still parses.

export const SHAPES = ['binary', 'choice', 'quantity', 'record'] as const;
export type Shape = (typeof SHAPES)[number];
export const PICKS = ['one', 'set', 'order'] as const;
export type Pick = (typeof PICKS)[number];

/** The catch-all the form adds to every list, so outcomes nobody named still have a home. */
export const SOMETHING_ELSE = 'Something else';

export interface Outcome {
  label: string;
  /** one: share of 1 across outcomes; set: chance this one makes it. Absent in a ranking. */
  probability?: number;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const near = (a: number, b: number) => Math.abs(a - b) < 0.005;

export function shapeOf(value: Record<string, unknown>): Shape | null {
  if (value.shape === undefined) return 'probability' in value ? 'binary' : null;
  return (SHAPES as readonly unknown[]).includes(value.shape) ? (value.shape as Shape) : null;
}

/** Whether the claim will be scored, and how. */
export function scoring(value: Record<string, unknown>): 'probability' | 'ranking' | 'interval' | 'none' {
  switch (shapeOf(value)) {
    case 'binary': return 'probability';
    case 'quantity': return 'interval';
    case 'choice': {
      const outcomes = Array.isArray(value.outcomes) ? (value.outcomes as Outcome[]) : [];
      return value.pick !== 'order' && outcomes.some((o) => isObj(o) && 'probability' in o) ? 'probability' : 'ranking';
    }
    default: return 'none';
  }
}

/** Shape-specific errors and warnings. */
export function checkShape(value: Record<string, unknown>): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const shape = shapeOf(value);
  if (!shape) return { errors: [`\`shape\` must be one of ${SHAPES.join(', ')} (or leave it out and give a \`probability\`)`], warnings };

  if (shape === 'binary') {
    const p = value.probability;
    if (!num(p)) errors.push('`probability` must be a number');
    else if (p <= 0 || p >= 1) errors.push('`probability` must be strictly between 0 and 1');
  }

  if (shape === 'choice') {
    if (!(PICKS as readonly unknown[]).includes(value.pick)) errors.push('`pick` must be one, set or order');
    const outcomes = value.outcomes;
    if (!Array.isArray(outcomes) || outcomes.length < 2 || !outcomes.every((o) => isObj(o) && typeof o.label === 'string' && o.label.trim())) {
      errors.push('`outcomes` must list at least two outcomes, each with a `label`');
    } else {
      const labels = outcomes.map((o) => (o.label as string).trim().toLowerCase());
      if (new Set(labels).size !== labels.length) errors.push('two outcomes have the same label');
      if (!labels.includes(SOMETHING_ELSE.toLowerCase()) && value.pick === 'one') {
        warnings.push(`no "${SOMETHING_ELSE}": if none of these happens, the claim can't resolve`);
      }
      const size = value.size;
      if (value.pick === 'set' || value.pick === 'order') {
        if (!(Number.isInteger(size) && (size as number) >= 1 && (size as number) < outcomes.length)) {
          errors.push('`size` must say how many make it (for set) or how many are ranked (for order), fewer than the outcomes listed');
        }
      }
      const ps = outcomes.map((o) => (o as Outcome).probability);
      const given = ps.filter((p) => p !== undefined);
      if (given.length) {
        if (value.pick === 'order') errors.push('an order is a ranking: leave the percentages out');
        else if (given.length !== ps.length) errors.push('give a percentage for every outcome, or for none');
        else if (!ps.every((p) => num(p) && p >= 0 && p <= 1)) errors.push('each probability must be between 0 and 1');
        else {
          const sum = (ps as number[]).reduce((a, b) => a + b, 0);
          if (value.pick === 'one' && !near(sum, 1)) errors.push(`the percentages add up to ${Math.round(sum * 100)}%, not 100%`);
          if (value.pick === 'set' && Number.isInteger(size) && !near(sum, size as number)) {
            errors.push(`the percentages add up to ${Math.round(sum * 100)}%; for ${size} places they should add up to ${(size as number) * 100}%`);
          }
        }
      }
    }
  }

  if (shape === 'quantity') {
    const r = value.range;
    if (!Array.isArray(r) || r.length !== 2 || !num(r[0]) || !num(r[1]) || r[0] >= r[1]) errors.push('`range` must be [low, high] with low below high');
    const c = value.confidence;
    if (!num(c) || c <= 0 || c >= 1) errors.push('`confidence` must be strictly between 0 and 1 (how sure the true value lands in the range)');
    if ('unit' in value && typeof value.unit !== 'string') errors.push('`unit` must be a string');
  }

  if ('voids_if' in value && (typeof value.voids_if !== 'string' || !value.voids_if.trim())) errors.push('`voids_if` must be a non-empty string');
  return { errors, warnings };
}
