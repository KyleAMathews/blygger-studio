/** Retained command for the rebuilt browser source control. Both baseline and
 * mutation now run through the real gap CLI with registered law attribution.
 */
import { spawn } from 'node:child_process';
const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/run-browser-oracle-gaps.ts', ...process.argv.slice(2)], { stdio: 'inherit', env: process.env });
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = signal ? 1 : code ?? 1; });
