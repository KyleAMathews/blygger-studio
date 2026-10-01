import { build } from "esbuild";
import { Miniflare } from "miniflare";
import { readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { createServer } from "node:http";
const output = await build({ entryPoints: ["src/index.ts"], bundle: true, platform: "neutral", mainFields: ["module", "main"], format: "esm", target: "es2022", loader: { ".txt": "text" }, write: false });
const mf = new Miniflare({ modules: true, script: output.outputFiles[0].text, compatibilityDate: "2026-07-01", host: "127.0.0.1", port: 8787, bindings: { OWNER_PASSWORD: "test-password", COOKIE_SECRET: "browser-test-cookie-secret", MOUNT: "" }, d1Databases: ["DB"], r2Buckets: ["MEDIA"], outboundService: () => new Response(null, { status: 503 }) });
const db = await mf.getD1Database("DB");
for (const migration of await readD1Migrations("./migrations")) {
  await db.batch(migration.queries.map((sql) => db.prepare(sql)));
}
await mf.ready;
// A separate mounted instance behind the documented forwarding ranges. The
// proxy rejects host-root assets rather than letting a permissive fixture hide
// a deployment dependency. Its database and cookies belong to this host only.
const mounted = new Miniflare({ modules: true, script: output.outputFiles[0].text, compatibilityDate: "2026-07-01", bindings: { OWNER_PASSWORD: "test-password", COOKIE_SECRET: "mounted-browser-test-cookie-secret", MOUNT: "/notes/b" }, d1Databases: ["DB"], r2Buckets: ["MEDIA"], outboundService: () => new Response(null, { status: 503 }) });
const mountedDb = await mounted.getD1Database("DB");
for (const migration of await readD1Migrations("./migrations")) await mountedDb.batch(migration.queries.map(sql => mountedDb.prepare(sql)));
await mountedDb.prepare("INSERT INTO subscriptions (id, kind, origin, feed_url, title, created) VALUES ('browser-source', 'rss', 'https://source.example/', 'https://source.example/feed', 'Browser source', '2026-10-01T00:00:00Z')").run();
await mountedDb.prepare("INSERT INTO imported_items (subscription_id, remote_id, kind, state, version, observed_at, content_md, content_html, l0) VALUES ('browser-source', 'remote', 'fragment', 'current', 1, '2026-10-01T00:00:00Z', '[Remote title](https://source.example/post)', '<p><a href=\"https://source.example/post\">Remote title</a></p>', 1)").run();
const proxy = createServer(async (request, response) => {
  try {
    const path = new URL(request.url!, "http://127.0.0.1:8789").pathname;
    if (!path.startsWith("/notes/b/") && !path.startsWith("/api/")) { response.writeHead(404); response.end("outside forwarding ranges"); return; }
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) if (value !== undefined && !["host", "content-length", "connection"].includes(name)) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
    const upstream = await mounted.dispatchFetch(`http://127.0.0.1:8789${request.url}`, { redirect: "manual", method: request.method, headers: Object.fromEntries(headers), ...(chunks.length ? { body: Buffer.concat(chunks) } : {}) });
    response.writeHead(upstream.status, Object.fromEntries(upstream.headers));
    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) { console.error(error); response.writeHead(500); response.end("fixture proxy error"); }
});
await new Promise<void>(resolve => proxy.listen(8789, "127.0.0.1", resolve));
console.log("Browser fixture ready at http://127.0.0.1:8787");
process.on("SIGTERM", async () => { proxy.close(); await Promise.all([mf.dispose(), mounted.dispose()]); process.exit(0); });
