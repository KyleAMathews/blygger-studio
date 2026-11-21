import path from 'node:path';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';
import { cloudflareOracleCapture, writeOracleCapture, workerOracleEnvironment } from './scripts/oracles-cloudflare.ts';

export default defineConfig({
  resolve: { alias: [{ find: /^(?:\.\.\/)+build\/extensions\.(names|server)\.ts$/, replacement: path.join(import.meta.dirname, 'test/fixtures/extensions.$1.ts') }] },
  plugins: [
    cloudflareOracleCapture(),
    cloudflareTest(async () => ({
      wrangler: { configPath: './wrangler.jsonc' }, remoteBindings: false,
      miniflare: {
        serviceBindings: { ORACLE_GAPS_CAPTURE: writeOracleCapture },
        outboundService: () => new Response(null, { status: 503 }),
        bindings: {
          ...workerOracleEnvironment(),
          TEST_MIGRATIONS: await readD1Migrations(path.join(import.meta.dirname, 'migrations')),
          OWNER_PASSWORD: 'test-password', COOKIE_SECRET: 'test-cookie-secret', MOUNT: '/blyg',
          API_READ_LIMIT: '100000', API_WRITE_LIMIT: '100000', MCP_REQUEST_LIMIT: '100000', MCP_DELEGATED_REQUEST_LIMIT: '100000',
        },
      },
    })),
  ],
  test: { include: ['test/derived-validators.oracle.test.ts'], setupFiles: ['./test/configure-oracles.ts', './test/apply-migrations.ts'], maxWorkers: 2 },
});
