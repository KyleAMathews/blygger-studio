// The `check` block: how a claim resolves. The oracle types are a closed list,
// chosen from a picker and stored as fixed identifiers, so two writers who
// mean the same source write the same thing. The claim carries the whole
// specification; resolving it never consults a catalog or a service.

// Five kinds of source, mutually exclusive by where trust in the answer comes
// from, and together exhaustive: the protocol, a publisher's versioned
// statistics, the authority that keeps a record, an unversioned web document,
// or people.
export const ORACLES = ['blyg', 'data_series', 'record', 'web_data', 'judgment'] as const;
export const PROVIDERS = [
  'owid', 'worldbank', 'un', 'imf', 'oecd', 'bis', 'ecb', 'eurostat', 'ons', 'fred',
  'who', 'ilo', 'fao', 'unhcr', 'noaa', 'copernicus', 'ember', 'other',
] as const;
export const REGISTRIES = [
  'eurlex', 'legislation_uk', 'uk_bills', 'congress',
  'companies_house', 'sec',
  'doi', 'arxiv', 'pubmed', 'who_ictrp', 'clinicaltrials', 'ema', 'fda',
  'espacenet', 'wipo', 'uspto',
  'icj', 'curia', 'bailii', 'courtlistener',
  'github', 'other',
] as const;
export type OracleType = (typeof ORACLES)[number];
export const OPS = ['>', '>=', '<', '<=', '==', '!='] as const;
export type Op = (typeof OPS)[number];

interface Comparison {
  /** With threshold, turns the value into yes or no; absent for "how much" claims. */
  op?: Op;
  threshold?: number | boolean | string;
  fallback?: Check;
}

export interface BlygCheck extends Comparison {
  oracle: 'blyg';
  metric: 'blygs_with_claims' | 'item_exists';
  among?: 'directory' | string[];
  exclude?: string[];
  item?: string;
}

export interface DataSeriesCheck extends Comparison {
  oracle: 'data_series';
  provider: (typeof PROVIDERS)[number];
  value: string;
  as_of: string;
}

/** An event of record: a bill's status, a filing, a paper, a ruling. */
export interface RecordCheck {
  oracle: 'record';
  registry: (typeof REGISTRIES)[number];
  /** The record's own identifier or URL, e.g. "119/hr/1" or an arXiv ID. */
  id: string;
  /** What has to appear in the record, e.g. "became law". */
  event: string;
}

export interface WebDataCheck extends Comparison {
  oracle: 'web_data';
  url: string;
  pointer: string;
}

export interface JudgmentCheck {
  oracle: 'judgment';
  by: 'author' | string[];
  evidence?: string;
}

export type Check = BlygCheck | DataSeriesCheck | RecordCheck | WebDataCheck | JudgmentCheck;

/** How the card describes resolution: computed from data, read from a record, or decided by people. */
export function resolvesBy(check: Check): 'automatic' | 'record' | 'judgment' {
  return check.oracle === 'judgment' ? 'judgment' : check.oracle === 'record' ? 'record' : 'automatic';
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isUrl = (v: unknown): v is string => {
  if (typeof v !== 'string') return false;
  try {
    return ['http:', 'https:'].includes(new URL(v).protocol);
  } catch {
    return false;
  }
};
const isUrlList = (v: unknown): v is string[] => Array.isArray(v) && v.length > 0 && v.every(isUrl);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Problems with a check block; empty when it is usable. `path` prefixes messages for nested fallbacks. */
export function checkCheck(value: unknown, path = 'check'): string[] {
  if (!isObj(value)) return [`\`${path}\` must be an object`];
  const o = value.oracle;
  if (typeof o !== 'string' || !(ORACLES as readonly string[]).includes(o)) {
    return [`\`${path}.oracle\` must be one of ${ORACLES.join(', ')}`];
  }
  const errs: string[] = [];
  if (o !== 'judgment' && o !== 'record') {
    // A comparison turns the value into yes or no. Without one, the value is
    // the outcome itself (a "how much" claim).
    if ('op' in value || 'threshold' in value) {
      if (!(OPS as readonly unknown[]).includes(value.op)) errs.push(`\`${path}.op\` must be one of ${OPS.join(' ')}`);
      if (!['number', 'boolean', 'string'].includes(typeof value.threshold)) errs.push(`\`${path}.threshold\` is required with \`op\``);
    }
    if ('fallback' in value) errs.push(...checkCheck(value.fallback, `${path}.fallback`));
  }
  switch (o) {
    case 'blyg':
      if (value.metric !== 'blygs_with_claims' && value.metric !== 'item_exists') errs.push(`\`${path}.metric\` must be blygs_with_claims or item_exists`);
      if ('among' in value && value.among !== 'directory' && !isUrlList(value.among)) errs.push(`\`${path}.among\` must be "directory" or a list of blyg URLs`);
      if ('exclude' in value && !(Array.isArray(value.exclude) && value.exclude.every(isUrl))) errs.push(`\`${path}.exclude\` must be a list of blyg URLs`);
      if (value.metric === 'item_exists' && !isUrl(value.item)) errs.push(`\`${path}.item\` must be the item's URL`);
      break;
    case 'data_series':
      if (!(PROVIDERS as readonly unknown[]).includes(value.provider)) errs.push(`\`${path}.provider\` must be one of ${PROVIDERS.join(', ')}`);
      if (typeof value.value !== 'string' || !/\S+@\d{4}-\d{2}-\d{2}/.test(value.value)) errs.push(`\`${path}.value\` must name at least one SERIES@DATE`);
      if (typeof value.as_of !== 'string' || !DATE.test(value.as_of)) errs.push(`\`${path}.as_of\` must be a date in YYYY-MM-DD form`);
      break;
    case 'record':
      if (!(REGISTRIES as readonly unknown[]).includes(value.registry)) errs.push(`\`${path}.registry\` must be one of ${REGISTRIES.join(', ')}`);
      if (typeof value.id !== 'string' || !value.id.trim()) errs.push(`\`${path}.id\` must name the record`);
      if (typeof value.event !== 'string' || !value.event.trim()) errs.push(`\`${path}.event\` must say what has to appear in the record`);
      break;
    case 'web_data':
      if (!isUrl(value.url)) errs.push(`\`${path}.url\` must be an http(s) URL`);
      if (typeof value.pointer !== 'string' || !(value.pointer === '' || value.pointer.startsWith('/'))) errs.push(`\`${path}.pointer\` must be a JSON Pointer such as /data/0/value`);
      break;
    case 'judgment':
      if (value.by !== 'author' && !isUrlList(value.by)) errs.push(`\`${path}.by\` must be "author" or a list of blyg URLs`);
      break;
  }
  return errs;
}

/** Apply a check's comparison to the value its oracle returned. */
export function compare(value: number | boolean | string, op: Op, threshold: number | boolean | string): boolean {
  switch (op) {
    case '==': return value === threshold;
    case '!=': return value !== threshold;
  }
  if (typeof value !== 'number' || typeof threshold !== 'number') {
    throw new Error(`${op} needs numbers, got ${typeof value} and ${typeof threshold}`);
  }
  switch (op) {
    case '>': return value > threshold;
    case '>=': return value >= threshold;
    case '<': return value < threshold;
    case '<=': return value <= threshold;
  }
}
