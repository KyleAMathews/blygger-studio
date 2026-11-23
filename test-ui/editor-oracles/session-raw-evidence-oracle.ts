/** Diagnostic persistence only; the canonical observations and judgment stay separate. */
import { appendFileSync, mkdtempSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inspect, types } from 'node:util';
import { serialize } from 'node:v8';
import type { Observe } from './document-oracle.ts';

export type RawRecord = (event: string, value: unknown) => void;
type RawIo = Pick<typeof import('node:fs'), 'appendFileSync' | 'mkdtempSync' | 'renameSync' | 'writeFileSync'>;
const filesystem: RawIo = { appendFileSync, mkdtempSync, renameSync, writeFileSync };

// Holding the actual thrown value never reads its name, stack or accessors.
// The wrapper retains this same value by identity when it rethrows or aggregates.
export const rawFailure = (error: unknown) => ({ error });

// V8 omits Error own-data fields such as nested AggregateError.errors. Represent
// Errors as descriptor graphs, preserving cycles/aliases through supported data
// containers. Accessor presence is retained without executing the accessor.
function diagnosticData(value: unknown, seen = new Map<object, unknown>()): unknown {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'function' || typeof value === 'symbol') throw new Error('Unsupported session raw evidence value: ' + typeof value);
    return value;
  }
  if (types.isProxy(value)) throw new Error('Unsupported session raw evidence value: Proxy');
  if (seen.has(value)) return seen.get(value);
  if (types.isNativeError(value)) {
    const properties: Record<string, unknown> = Object.create(null), descriptors: Record<string, unknown> = Object.create(null);
    const result = { kind: 'Error', properties, descriptors }; seen.set(value, result);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string') throw new Error('Unsupported session raw evidence Error symbol property');
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      descriptors[key] = { enumerable: descriptor.enumerable, configurable: descriptor.configurable,
        ...('value' in descriptor ? { kind: 'data', writable: descriptor.writable } : { kind: 'accessor', get: !!descriptor.get, set: !!descriptor.set }) };
      if ('value' in descriptor) properties[key] = diagnosticData(descriptor.value, seen);
    }
    return result;
  }
  if (types.isMap(value)) {
    const result = new Map(); seen.set(value, result);
    for (const [key, item] of Map.prototype.entries.call(value)) result.set(diagnosticData(key, seen), diagnosticData(item, seen));
    return result;
  }
  if (types.isSet(value)) {
    const result = new Set(); seen.set(value, result);
    for (const item of Set.prototype.values.call(value)) result.add(diagnosticData(item, seen));
    return result;
  }
  if (types.isAnyArrayBuffer(value) || types.isArrayBufferView(value)) return value;
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) throw new Error('Unsupported session raw evidence object');
  const result = Array.isArray(value) ? new Array(value.length) : Object.create(prototype); seen.set(value, result);
  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!('value' in descriptor)) throw new Error('Unsupported session raw evidence data accessor');
    Object.defineProperty(result, key, { value: diagnosticData(descriptor.value, seen), enumerable: true, configurable: true, writable: true });
  }
  return result;
}

export function sessionRawEvidence(root: string, identity: unknown, plan: unknown, io: RawIo = filesystem) {
  const failures: { phase: string; occurrence?: number; error: unknown }[] = [];
  let directory: string | undefined, binary: string | undefined, readable: string | undefined, occurrence = 0;
  const fault = (phase: string, error: unknown, at?: number) => { failures.push({ phase, occurrence: at, error }); };
  try { directory = io.mkdtempSync(join(root, 'editor-session-')); }
  catch (error) { fault('initialize directory', error); }
  if (directory) {
    binary = join(directory, 'trace.v8'); readable = join(directory, 'trace.txt');
    try { io.writeFileSync(binary, Buffer.alloc(0), { flag: 'wx' }); } catch (error) { fault('initialize binary', error); }
    try { io.writeFileSync(readable, '', { flag: 'wx' }); } catch (error) { fault('initialize readable', error); }
  }
  const record: RawRecord = (event, value) => {
    const at = occurrence++;
    let entry: unknown;
    try { entry = diagnosticData({ occurrence: at, event, value }); }
    catch (error) { fault('encode record', error, at); return; }
    if (binary) try {
      const data = serialize(entry), length = Buffer.alloc(4); length.writeUInt32BE(data.length);
      io.appendFileSync(binary, Buffer.concat([length, data]));
    } catch (error) { fault('append binary', error, at); }
    if (readable) try {
      io.appendFileSync(readable, inspect(entry, { depth: null, maxArrayLength: null, maxStringLength: null, sorted: false, customInspect: false, compact: false }) + '\n');
    } catch (error) { fault('append readable', error, at); }
  };
  record('start', { identity, plan });
  return { directory, record, finish(failed: boolean, error: unknown) {
    // A stream footer is never evidence completion: either append can fail.
    record('finish', { status: 'pending', driverThrew: failed, failure: failed ? rawFailure(error) : undefined });
    if (directory) try {
      const receipt = serialize(diagnosticData({ status: failed || failures.length ? 'partial' : 'complete', driverThrew: failed,
        failure: failed ? rawFailure(error) : undefined, persistenceFailures: [...failures], occurrences: occurrence }));
      const staging = join(directory, 'completion.v8.tmp');
      io.writeFileSync(staging, receipt, { flag: 'wx' });
      // Only this atomically published receipt is authoritative. No receipt, or
      // a staging file alone, means incomplete; two streams are not one commit.
      io.renameSync(staging, join(directory, 'completion.v8'));
    } catch (error) { fault('publish completion', error); }
    return failures;
  } };
}

export async function withSessionRawEvidence(root: string, identity: unknown, plan: unknown, observe: Observe,
  run: (observe: Observe, raw: RawRecord) => Promise<void>, io: RawIo = filesystem) {
  const evidence = sessionRawEvidence(root, identity, plan, io);
  let failed = false, failure: unknown;
  try {
    await run((checkpoint, value) => {
      evidence.record('observation', { checkpoint, value });
      observe(checkpoint, value);
    }, evidence.record);
  } catch (error) {
    failed = true; failure = error;
    evidence.record('driver-failure', rawFailure(error));
  }
  const persistenceFailures = evidence.finish(failed, failure);
  if (persistenceFailures.length) {
    const error = new AggregateError([...(failed ? [failure] : []), ...persistenceFailures], 'Session raw evidence apparatus failed', { cause: failure });
    error.name = 'SessionRawEvidenceError';
    throw error;
  }
  if (failed) throw failure;
}
