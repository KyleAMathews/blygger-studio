/** Opt-in transport timings only. Never receives editor data or judges a law. */
import { appendFileSync, mkdtempSync, writeSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { threadId } from 'node:worker_threads';

const stages = [
  'source.application-import', 'source.verify', 'source.sheets-import', 'source.sheets-verify', 'source.raw-imports',
  'application.browser-document', 'application.new-context', 'application.source', 'application.setup', 'application.history',
  'application.close-context', 'application.drain',
  'mixed.seed', 'mixed.navigation', 'mixed.ready', 'mixed.initialize', 'mixed.focus', 'mixed.input',
  'mixed.resolve', 'mixed.delivery', 'mixed.key-listener', 'mixed.native-command', 'mixed.key-receipt',
  'mixed.step', 'mixed.packet', 'mixed.native-commit', 'mixed.suffix', 'mixed.native-close',
] as const;
type Stage = typeof stages[number];
type Counts = Partial<Record<'sourceUtf16Units' | 'inputs' | 'rawImports' | 'drainOperations', number>>;
type CountSource = Counts | (() => Counts);
type Span = { stage: Stage; id: number; started: number };
const allowedStages = new Set<string>(stages);
const allowedCounts = new Set(['sourceUtf16Units', 'inputs', 'rawImports', 'drainOperations']);
const directory = process.env.FORMATTING_ORACLE_DIAGNOSTICS_DIR;
const enabled = !!directory && isAbsolute(directory);
const limit = 256;
let pending: string[] = [], sink: string | undefined, sequence = 0, spanSequence = 0, failed = false;

// Failures here cannot replace an original production/driver/cleanup failure.
// The fixed notice contains no path, exception text or application information.
function stopDiagnostics() {
  failed = true; pending = [];
  try { writeSync(2, 'formatting-diagnostics: sink-disabled\n'); } catch { /* Diagnostic output is best effort. */ }
}
function numericCounts(source: CountSource = {}) {
  const counts = typeof source === 'function' ? source() : source;
  const result: Record<string, number> = {};
  for (const [name, value] of Object.entries(counts)) {
    if (!allowedCounts.has(name) || !Number.isSafeInteger(value) || value! < 0) continue;
    result[name] = value!;
  }
  return result;
}
function flush() {
  if (!pending.length || failed || !enabled) return;
  try {
    sink ??= join(mkdtempSync(join(directory!, `worker-${process.pid}-${threadId}-`)), 'phases.jsonl');
    appendFileSync(sink, pending.join(''), { encoding: 'utf8', flag: 'a' });
    pending = [];
  } catch { stopDiagnostics(); }
}
function record(stage: string, span: number, counts?: CountSource, durationMs?: number) {
  if (!enabled || failed) return;
  try {
    pending.push(JSON.stringify({ schema: 1, sequence: ++sequence, stage, span,
      ...(durationMs === undefined ? {} : { durationMs }), ...numericCounts(counts) }) + '\n');
    if (pending.length >= limit) flush();
  } catch { stopDiagnostics(); }
}
/** Synchronous: disabled diagnostics read no clock, touch no file and add no task. */
export function formattingDiagnosticStart(stage: Stage, counts?: CountSource): Span | undefined {
  if (!enabled || failed) return;
  try {
    if (!allowedStages.has(stage)) return;
    const id = ++spanSequence;
    record(stage + '.begin', id, counts);
    return { stage, id, started: performance.now() };
  } catch { stopDiagnostics(); return; }
}
export function formattingDiagnosticEnd(span: Span | undefined, counts?: CountSource) {
  if (!enabled || !span || failed) return;
  try {
    const durationMs = Math.max(0, Math.round((performance.now() - span.started) * 1000) / 1000);
    if (!Number.isFinite(durationMs)) return;
    record(span.stage + '.end', span.id, counts, durationMs);
  } catch { stopDiagnostics(); }
}
/** Existing browser teardown calls this synchronously, even if cleanup rejects. */
export function flushFormattingDiagnostics() {
  if (!enabled || failed) return;
  record('diagnostics.final-flush', 0);
  flush();
}
