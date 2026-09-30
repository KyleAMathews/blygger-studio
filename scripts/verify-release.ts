import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Miniflare } from "miniflare";

const output = "build/release";
const manifest = JSON.parse(readFileSync(join(output, "release.json"), "utf8"));
for (const line of readFileSync(join(output, "SHA256SUMS"), "utf8").trim().split("\n")) {
  const [expected, name] = line.split("  ");
  assert.equal(createHash("sha256").update(readFileSync(join(output, name))).digest("hex"), expected);
}
const temp = mkdtempSync(join(tmpdir(), "blygger-release-"));
let mf: Miniflare | undefined;
try {
  const workerArchive = manifest.artifacts.find((file: string) => file.endsWith(".tar.gz"));
  const sdkArchive = manifest.artifacts.find((file: string) => file.endsWith(".tgz"));
  execFileSync("tar", ["-xzf", resolve(output, workerArchive), "-C", temp]);
  execFileSync("tar", ["-xzf", resolve(output, sdkArchive), "-C", temp]);
  const worker = join(temp, `blygger-worker-${manifest.studioVersion}`);
  const config = readFileSync(join(worker, "wrangler.jsonc"), "utf8");
  assert.match(config, /"main": "worker.js"/);
  assert.match(config, /"no_bundle": true/);
  assert.match(config, /FILL-ME-run-npm-run-init/);
  mf = new Miniflare({ modules: true, script: readFileSync(join(worker, "worker.js"), "utf8"), compatibilityDate: "2026-07-01", bindings: { MOUNT: "", OWNER_PASSWORD: "test", COOKIE_SECRET: "release-smoke-test-secret" }, d1Databases: ["DB"], r2Buckets: ["MEDIA"] });
  assert.equal((await mf.dispatchFetch("http://localhost/api/openapi.json")).status, 401);
  const browser = await mf.dispatchFetch("http://localhost/studio-sdk.js");
  assert.equal(browser.status, 200);
  assert.match(await browser.text(), /blygger/);
  const sdk = await import(pathToFileURL(join(temp, "package/dist/index.js")).href);
  assert.equal(typeof sdk.BlyggerClient, "function");
  assert.ok(readFileSync(join(temp, "package/LICENSE"), "utf8").includes("MIT"));
  assert.equal(JSON.parse(readFileSync(join(temp, "package/package.json"), "utf8")).version, manifest.sdkVersion);
  console.log("Release checksums, extracted Worker, and packaged SDK verified");
} finally {
  await mf?.dispose();
  rmSync(temp, { recursive: true, force: true });
}
