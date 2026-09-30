import { build } from "esbuild";
import { Miniflare } from "miniflare";
import { readD1Migrations } from "@cloudflare/vitest-pool-workers";
const output = await build({ entryPoints: ["src/index.ts"], bundle: true, platform: "neutral", mainFields: ["module", "main"], format: "esm", target: "es2022", loader: { ".txt": "text" }, write: false });
const mf = new Miniflare({ modules: true, script: output.outputFiles[0].text, compatibilityDate: "2026-07-01", host: "127.0.0.1", port: 8787, bindings: { OWNER_PASSWORD: "test-password", COOKIE_SECRET: "browser-test-cookie-secret", MOUNT: "" }, d1Databases: ["DB"], r2Buckets: ["MEDIA"], outboundService: () => new Response(null, { status: 503 }) });
const db = await mf.getD1Database("DB");
for (const migration of await readD1Migrations("./migrations")) {
  await db.batch(migration.queries.map((sql) => db.prepare(sql)));
}
await mf.ready;
console.log("Browser fixture ready at http://127.0.0.1:8787");
process.on("SIGTERM", async () => { await mf.dispose(); process.exit(0); });
