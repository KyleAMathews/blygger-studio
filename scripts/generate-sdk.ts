import { mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

// Forge's TS transformer is not on npm yet. Pin and build its public source.
const revision = "056b13e10e35672480de15955aefd8ade03a9732";
const root = process.cwd(), work = mkdtempSync(join(tmpdir(), "blygger-forge-"));
const run = (command: string, args: string[], cwd = root, env = process.env) => execFileSync(command, args, { cwd, env, stdio: "inherit" });
try {
  const response = await fetch(`https://codeload.github.com/cloudflare/forge/tar.gz/${revision}`);
  if (!response.ok) throw new Error(`Forge download: ${response.status}`);
  writeFileSync(join(work, "source.tar.gz"), new Uint8Array(await response.arrayBuffer()));
  const checkout = join(work, "source"); mkdirSync(checkout);
  run("tar", ["-xzf", join(work, "source.tar.gz"), "-C", checkout, "--strip-components=1"]);
  const pnpm = join(root, "node_modules/pnpm/bin/pnpm.cjs");
  run(process.execPath, [pnpm, "--filter", "@cloudflare/forge-transformer-sdk-ts...", "install", "--frozen-lockfile", "--ignore-scripts"], checkout);
  // The package builder expects Cloudflare's generated spec metadata. Only its
  // positional-input mode is used here; supply our spec to build the tool.
  const original = JSON.parse(readFileSync(join(root, "openapi.json"), "utf8"));
  const schemaDir = join(checkout, "packages/cloudflare-fern-config/fern"); mkdirSync(schemaDir, { recursive: true });
  writeFileSync(join(schemaDir, "openapi.json"), JSON.stringify(original));
  writeFileSync(join(checkout, "openapi.json"), JSON.stringify(original));
  run(process.execPath, ["--import", "tsx", "scripts/build-package.ts"], join(checkout, "packages/cloudflare-forge-transformer-sdk-ts"));
  // Fern cannot represent cookie auth. The SDK supplies cookies through fetch;
  // retain auth in the actual contract and omit it only from generator input.
  const input = structuredClone(original);
  delete input.components.securitySchemes;
  for (const path of Object.values(input.paths) as Record<string, unknown>[]) {
    for (const operation of Object.values(path) as Record<string, unknown>[]) delete operation.security;
  }
  const inputPath = join(work, "input.json"), output = join(work, "output"), ca = join(work, "empty-ca.pem");
  writeFileSync(inputPath, JSON.stringify(input)); writeFileSync(ca, "");
  // Skip Forge's macOS certificate-store lookup. No host credential/certificate
  // store is needed to generate this SDK.
  run(process.execPath, [join(checkout, "packages/cloudflare-forge-transformer-sdk-ts/dist/cli.js"), inputPath, "--out", output], root, { ...process.env, FERN_GENERATOR_HOST_CA_PEM: ca, FERN_TYPESCRIPT_SHARD_COUNT: "1" });
  const destination = join(root, "sdk/generated"); rmSync(destination, { recursive: true, force: true });
  cpSync(join(output, "sdk"), destination, { recursive: true });
  cpSync(join(checkout, "LICENSE"), join(root, "sdk/FORGE-LICENSE"));
  writeFileSync(join(root, "sdk/generation.json"), JSON.stringify({ forgeRevision: revision, transformer: "@cloudflare/forge-transformer-sdk-ts", fernTypeScriptVersion: "3.80.1", overlay: "cookie authentication is supplied by the SDK transport" }, null, 2) + "\n");
} finally { rmSync(work, { recursive: true, force: true }); }
