// content_md → claim and resolution blocks. Pure; shared by the CLI and the
// Studio extension.
//
// Which fences count:
// - `claim` and `resolution` fences always count, and invalid JSON in them is an error.
// - A `json` or unlabeled fence counts as a claim when its object has
//   `resolves_by` and either `probability` or `shape`, and as a resolution when it has `outcome`
//   and no `probability`. Anything else in such a fence is ordinary code and is
//   left alone, as is every other fence.

import { findFences } from './fences.ts';
import { checkClaim, checkResolution, type ClaimBlock, type Issue, type ResolutionBlock } from './types.ts';

export interface Located<T> {
  value: T;
  /** The fence it came from: `claim`, `resolution`, `json` or "". */
  fence: string;
  line: number;
}

export interface Parsed {
  claims: Located<ClaimBlock>[];
  resolutions: Located<ResolutionBlock>[];
  issues: Issue[];
}

const LOOSE = new Set(['json', '']);

function tryJson(body: string): { ok: true; value: unknown } | { ok: false; message: string } {
  try {
    return { ok: true, value: JSON.parse(body) };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function parseContent(markdown: string): Parsed {
  const out: Parsed = { claims: [], resolutions: [], issues: [] };
  for (const f of findFences(markdown)) {
    const strict = f.info === 'claim' || f.info === 'resolution';
    if (!strict && !LOOSE.has(f.info)) continue;
    const json = tryJson(f.body);
    if (!json.ok) {
      if (strict) out.issues.push({ level: 'error', line: f.startLine, message: `invalid JSON in a \`${f.info}\` block: ${json.message}` });
      continue;
    }
    let kind: 'claim' | 'resolution' | null = strict ? (f.info as 'claim' | 'resolution') : null;
    if (!kind && isObject(json.value)) {
      if ('resolves_by' in json.value && ('probability' in json.value || 'shape' in json.value)) kind = 'claim';
      else if ('outcome' in json.value && !('probability' in json.value)) kind = 'resolution';
    }
    if (!kind) continue;
    if (!f.closed) out.issues.push({ level: 'warning', line: f.startLine, message: 'the fence is never closed' });
    const { errors, warnings } = kind === 'claim' ? checkClaim(json.value) : checkResolution(json.value);
    for (const message of errors) out.issues.push({ level: 'error', line: f.startLine, message });
    for (const message of warnings) out.issues.push({ level: 'warning', line: f.startLine, message });
    if (errors.length) continue;
    if (kind === 'claim') out.claims.push({ value: json.value as ClaimBlock, fence: f.info, line: f.startLine });
    else out.resolutions.push({ value: json.value as ResolutionBlock, fence: f.info, line: f.startLine });
  }
  if (out.claims.length > 1) out.issues.push({ level: 'error', line: out.claims[1].line, message: 'more than one claim block: one claim per item' });
  if (out.resolutions.length > 1) out.issues.push({ level: 'error', line: out.resolutions[1].line, message: 'more than one resolution block' });
  if (out.claims.length === 1) proseCheck(markdown, out.claims[0], out.issues);
  return out;
}

// "Probability: 0.85", "probability = 85%" in the prose, outside any fence.
const PROSE_P = /\bprobability\s*[:=]\s*(\d*\.\d+|\d+(?:\.\d+)?\s*%)/gi;

function proseCheck(markdown: string, claim: Located<ClaimBlock>, issues: Issue[]): void {
  const p = claim.value.probability;
  if (typeof p !== 'number') return;
  const fenced = new Set<number>();
  for (const f of findFences(markdown)) for (let l = f.startLine; l <= f.endLine; l++) fenced.add(l);
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  lines.forEach((text, i) => {
    if (fenced.has(i + 1)) return;
    for (const m of text.matchAll(PROSE_P)) {
      const raw = m[1].replace(/\s/g, '');
      const stated = raw.endsWith('%') ? Number(raw.slice(0, -1)) / 100 : Number(raw);
      if (Math.abs(stated - p) > 1e-9) {
        issues.push({ level: 'warning', line: i + 1, message: `the prose says probability ${raw}, the claim block says ${claim.value.probability}` });
      }
    }
  });
}
