import path from "node:path";
import { readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";
import { cloudflareOracleCapture, cloudflareOracleTest, writeOracleCapture, workerOracleEnvironment } from "./scripts/oracles-cloudflare.ts";

const retiredReplay = ['ORACLE_TARGET', 'ORACLE_SEED', 'ORACLE_PATH'].find(name => process.env[name] !== undefined);
if (retiredReplay) throw new Error(`${retiredReplay}: Worker oracle replay moved to WORKER_ORACLE_PROPERTY, WORKER_ORACLE_SEED, WORKER_ORACLE_PATH and WORKER_ORACLE_UNIT`);

export const workerTestConfig = (lazyEntrypoint = false) => defineConfig({
  // Every extension in the repository is compiled into the suite, whatever the
  // operator's extensions.local.json says (test/fixtures/extensions.*.ts).
  resolve: {
    alias: [{ find: /^(?:\.\.\/)+build\/extensions\.(names|server)\.ts$/, replacement: path.join(import.meta.dirname, "test/fixtures/extensions.$1.ts") }],
  },
  plugins: [
    cloudflareOracleCapture(),
    cloudflareOracleTest(async () => {
      const migrations = await readD1Migrations(path.join(import.meta.dirname, "migrations"));
      return {
        wrangler: { configPath: "./wrangler.jsonc" },
        // An operator's wrangler.jsonc may bind Workers AI (studio#8), which
        // is always remote: never proxy it to real, billed inference from a
        // test. The suite passes a fake env.AI where it needs one.
        remoteBindings: false,
        miniflare: {
          serviceBindings: { ORACLE_GAPS_CAPTURE: writeOracleCapture },
          // Background delivery and update checks cannot reach the real network.
          outboundService: () => new Response(null, { status: 503 }),
          bindings: {
            ...workerOracleEnvironment(),
            TEST_MIGRATIONS: migrations,
            OWNER_PASSWORD: "test-password",
            COOKIE_SECRET: "test-cookie-secret",
            // An operator's .dev.vars must not reach the suite: a real or fake
            // key starts background model calls the tests never asked for (studio#167).
            AI_PROVIDER_KEY: "",
            OPENAI_API_KEY: "",
            GOOGLE_AI_KEY: "",
            TYPESAFE_API_KEY: "",
            // Pin the default mount explicitly (matches wrangler.jsonc vars);
            // mount.test.ts exercises other mounts via makeApp() directly.
            MOUNT: "/blyg",
            // The owner's per-minute API budget (0.28) is a production guard.
            // Property tests issue far more than 120 writes a minute and failed
            // about one run in six on it; tests of the budget set their own.
            API_READ_LIMIT: "100000",
            API_WRITE_LIMIT: "100000",
            // The scope oracle opens a real MCP connection for all 31 nonempty
            // subsets. Budget oracles supply their own small limits.
            MCP_REQUEST_LIMIT: "100000",
            MCP_DELEGATED_REQUEST_LIMIT: "100000",
          },
        },
      };
    }, lazyEntrypoint),
  ],
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["test/**/*.oracle.test.ts"],
    setupFiles: ["./test/configure-oracles.ts", "./test/apply-migrations.ts"],
  },
});

export default workerTestConfig();
