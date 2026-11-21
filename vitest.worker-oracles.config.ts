import config from './vitest.config.ts';

export default {
  ...config,
  test: { ...config.test, include: process.env.BLYG_ORACLE_FILES?.split(',') ?? ['test/*.oracle.test.ts'], exclude: [], maxWorkers: 2 },
};
