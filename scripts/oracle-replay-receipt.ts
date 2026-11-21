/** Read the native failure receipt, rather than guessing which history failed.
 * The gap CLI deliberately summarizes failures, so a verifier retains Vitest's
 * complete errors alongside its normal gap report. Names identify the unit;
 * fast-check supplies the seed, shrink path and reduced counterexample.
 */
export interface CapturedOracleFailure { names: string[]; errors: unknown[] }
export interface OracleReplayReceipt {
  property: string; seed: string; path: string; unit: string;
  law: string; checkpoint: string; counterexample: string; history: string;
}
function messages(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  const error = value as { message?: unknown; cause?: unknown; errors?: unknown[] };
  return [typeof error.message === 'string' ? error.message : '', ...messages(error.cause), ...(error.errors ?? []).flatMap(messages)];
}
export function capturedOracleReplay(failures: CapturedOracleFailure[], law: string): OracleReplayReceipt {
  for (const failure of failures) {
    const text = failure.errors.flatMap(messages).join('\n');
    const violation = /(?:^|\n)([^\s]+) violated at checkpoint "([^"]*)" \(law: ([^\n]*)\)\./.exec(text);
    if (!violation || violation[3] !== law) continue;
    const inputs = /seed:\s*(-?\d+),\s*path:\s*"([^"]*)"/.exec(text);
    const counterexample = /(?:^|\n)Counterexample: ([^\n]+)/.exec(text)?.[1];
    const history = /(?:^|\n)History: ([^\n]+)/.exec(text)?.[1];
    const named = failure.names.at(-1);
    const unit = named?.replace(/^fixed seed -?\d+: /, 'random seed: ');
    if (!inputs || counterexample === undefined || history === undefined || !unit?.startsWith('random seed: '))
      throw new Error(`The ${law} failure omitted its native generated replay receipt`);
    return { property: violation[1], seed: inputs[1], path: inputs[2], unit, law, checkpoint: violation[2], counterexample, history };
  }
  throw new Error(`No captured generated failure under law ${law}`);
}
