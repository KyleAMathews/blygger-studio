// Resolving a claim: the answer a person gives, turned into a resolution
// block that is appended to the claim's item as a new version. The claim
// block itself is never touched.

import { parseContent } from './parse.ts';
import { shapeOf } from './shapes.ts';
import type { ClaimBlock, ResolutionBlock } from './types.ts';

export type Answer =
  | { kind: 'void'; note: string }
  | { kind: 'binary'; outcome: boolean }
  | { kind: 'choice'; labels: string[] }
  | { kind: 'quantity'; value: number };

export type Status = 'open' | 'due' | 'resolved' | 'void' | 'record';

/** Where a claim stands, from its current text. */
export function status(contentMd: string, today: string): { status: Status; claim: ClaimBlock | null; resolution: ResolutionBlock | null } {
  const p = parseContent(contentMd);
  const claim = p.claims[0]?.value ?? null;
  const resolution = p.resolutions[0]?.value ?? null;
  if (!claim) return { status: 'open', claim: null, resolution };
  if (resolution) return { status: resolution.outcome === 'void' ? 'void' : 'resolved', claim, resolution };
  if (shapeOf(claim) === 'record') return { status: 'record', claim, resolution };
  return { status: claim.resolves_by <= today ? 'due' : 'open', claim, resolution };
}

/** Problems with an answer for this claim; empty when it can be published. */
export function checkAnswer(claim: ClaimBlock, a: Answer, evidence: string): string[] {
  const out: string[] = [];
  const shape = shapeOf(claim);
  if (a.kind === 'void') {
    if (!a.note.trim()) out.push("Say why it can't be decided.");
    return out;
  }
  if (!evidence.trim()) out.push('Link the evidence, so a reader can check your answer.');
  else if (!/^https?:\/\/\S+$/.test(evidence.trim())) out.push('The evidence should be a link (https://…).');
  if (shape === 'binary' && a.kind !== 'binary') out.push('Choose yes or no.');
  if (shape === 'quantity' && (a.kind !== 'quantity' || !Number.isFinite(a.value))) out.push('Give the number.');
  if (shape === 'choice') {
    if (a.kind !== 'choice') return [...out, 'Choose from the list.'];
    const labels = (claim.outcomes ?? []).map((o) => o.label);
    if (a.labels.some((l) => !labels.includes(l))) out.push('Choose only outcomes from the list.');
    const want = claim.pick === 'one' ? 1 : claim.size ?? 1;
    if (a.labels.length !== want) out.push(claim.pick === 'one' ? 'Choose the one that happened.' : `Choose ${want}.`);
    if (new Set(a.labels).size !== a.labels.length) out.push('Each outcome only once.');
  }
  return out;
}

export function toResolution(a: Answer, evidence: string, today: string, note?: string): ResolutionBlock {
  const outcome = a.kind === 'void' ? 'void' : a.kind === 'binary' ? a.outcome : a.kind === 'quantity' ? a.value : a.labels.length === 1 ? a.labels[0] : a.labels;
  const r: ResolutionBlock = { outcome, resolved_at: today };
  if (evidence.trim()) r.evidence = [evidence.trim()];
  const n = a.kind === 'void' ? a.note : note;
  if (n?.trim()) r.note = n.trim();
  return r;
}

/** The item's new text: everything as it was, with the resolution appended. */
export function appendResolution(contentMd: string, r: ResolutionBlock): string {
  if (parseContent(contentMd).resolutions.length) throw new Error('This claim is already resolved.');
  return `${contentMd.replace(/\s+$/, '')}\n\n\`\`\`resolution\n${JSON.stringify(r, null, 2)}\n\`\`\`\n`;
}

/** A short line for the changelog note. */
export function describeOutcome(r: ResolutionBlock): string {
  const o = r.outcome;
  if (o === 'void') return "Can't be decided";
  if (o === true) return 'Yes';
  if (o === false) return 'No';
  return Array.isArray(o) ? o.join(', ') : String(o);
}
