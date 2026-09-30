import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { copyFileSync, readFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
copyFileSync("LICENSE", "sdk/LICENSE");
rmSync("sdk/dist", { recursive: true, force: true });
execFileSync("./node_modules/.bin/tsc", ["-p", "sdk/tsconfig.json"], { stdio: "inherit" });
for (const [outfile, platform] of [["sdk/dist/index.js", "neutral"], ["sdk/dist/browser.js", "browser"]] as const) {
  await build({ entryPoints: ["sdk/index.ts"], outfile, bundle: true, format: "esm", platform, target: "es2022" });
}
copyFileSync("sdk/dist/index.d.ts", "sdk/dist/browser.d.ts");
mkdirSync("build", { recursive: true });
const spec = JSON.parse(readFileSync("openapi.json", "utf8"));
const operations = Object.entries(spec.paths).flatMap(([path, value]) => Object.entries(value as Record<string, any>).map(([method, op]) => ({ name: op.operationId, method: method.toUpperCase(), path, body: Boolean(op.requestBody), parameters: (op.parameters ?? []).map((p: any) => ({ name: p.name, in: p.in, type: p.schema?.type })) })));
writeFileSync("build/studio-operations.txt", JSON.stringify(operations));
const browser = await build({ entryPoints: ["src/browser.ts"], bundle: true, format: "iife", platform: "browser", target: "es2022", minify: true, loader: { ".txt": "text" }, write: false });
writeFileSync("build/studio-sdk.txt", browser.outputFiles[0].text);
