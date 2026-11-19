import parser from '@typescript-eslint/parser';
import oracles from '@tanstack/eslint-plugin-oracles';

// These presets enforce oracle structure and production probe syntax only.
// Formatting is handled separately by the repository's formatting work.
export default [
  { ignores: ['node_modules/**', 'build/**', 'sdk/generated/**', 'sdk/dist/**', '.worktrees/**'] },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    settings: { oracles: { nonTestPackages: ['better-auth/api'] } },
    languageOptions: { parser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } } },
  },
  oracles.configs.recommended,
  oracles.configs.production,
  {
    files: ['scripts/run-browser-oracle-gaps.ts', 'scripts/run-search-oracle-gaps.ts', 'test-browser/**/*.ts'],
    settings: { oracles: { envPrefix: 'BROWSER_ORACLE' } },
  },
];
