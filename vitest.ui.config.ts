import { defineConfig } from 'vitest/config';

const legacyReplay = ['ORACLE_TARGET', 'ORACLE_SEED', 'ORACLE_PATH'].find(name => process.env[name] !== undefined);
if (legacyReplay) throw new Error(`${legacyReplay}: Studio polling replay moved to STUDIO_ORACLE_SEED, STUDIO_ORACLE_PATH, STUDIO_ORACLE_PROPERTY and STUDIO_ORACLE_UNIT; use vitest.oracles.config.ts`);
export default defineConfig({
  test: { include: ['test-ui/**/*.test.ts'], exclude: ['test-ui/**/*.oracle.test.ts'], environment: 'node', maxWorkers: 2 },
});
