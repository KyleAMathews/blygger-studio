import { defineConfig } from 'vitest/config';
import { formattingBrowserSource } from './test-ui/editor-oracles/browser-source-oracle.ts';
import { formattingOracleFiles } from './test-ui/editor-oracles/property-registry-oracle.ts';

const selected = process.env.FORMATTING_ORACLE_FILE;
const baseline = process.env.FORMATTING_BASELINE_SCOPE === undefined ? undefined
  : (await import('./scripts/formatting-baseline-plan.ts')).readBaselineScope(process.cwd());
if (baseline && selected !== undefined) throw new Error('Baseline partitions cannot inherit --oracle selection');
const files = baseline?.files ?? (selected === 'receivers'
  ? ['test-ui/editor-bracket-receiver.oracle.test.ts', 'test-ui/editor-escape-layers.oracle.test.ts', 'test-ui/editor-receivers.oracle.test.ts']
  : selected === 'session' ? ['test-ui/editor-session.oracle.test.ts', 'test-ui/editor-newline-history.oracle.test.ts']
  : selected ? [`test-ui/editor-${selected}.oracle.test.ts`] : [...formattingOracleFiles]);
for (const file of files) if (!(formattingOracleFiles as readonly string[]).includes(file)) throw new Error('Unknown formatting oracle file: ' + file);
// Vitest's reporter separates suites with " > ". The name filter uses spaces.
const testNamePattern = baseline?.tests && new RegExp('^(?:' + baseline.tests.map(name =>
  name.replaceAll(' > ', ' ').replace(/[.*+?^$${}()|[\]\\]/g, '\\$&')).join('|') + ')$');

export default defineConfig({
  cacheDir: baseline ? 'build/formatting-oracle-cache/' + baseline.part : 'build/formatting-oracle-cache',
  plugins: [formattingBrowserSource()],
  test: { include: files, testNamePattern, setupFiles: ['./test-ui/editor-oracles/configure-oracles.ts'], environment: 'node' },
});
