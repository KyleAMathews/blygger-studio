import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
copyFileSync("LICENSE", "sdk/LICENSE");
execFileSync("./node_modules/.bin/tsc", ["-p", "sdk/tsconfig.json"], { stdio: "inherit" });
await build({ entryPoints: ["sdk/index.ts"], outfile: "sdk/dist/index.js", bundle: true, format: "esm", platform: "neutral", target: "es2022", external: ["fs", "stream"] });
await build({ entryPoints: ["sdk/index.ts"], outfile: "sdk/dist/browser.js", bundle: true, format: "esm", platform: "browser", target: "es2022", plugins: [{ name: "native-files", setup(build) {
  build.onResolve({ filter: /^(fs|stream)$/ }, (args) => ({ path: args.path, namespace: "node-only" }));
  build.onLoad({ filter: /.*/, namespace: "node-only" }, () => ({ contents: 'export function createReadStream() { throw new Error("Use File or Blob uploads in browsers and Workers"); } export class Readable { static from() { throw new Error("Node streams require the Node SDK"); } }' }));
} }] });
copyFileSync("sdk/dist/index.d.ts", "sdk/dist/browser.d.ts");
mkdirSync("build", { recursive: true });
const browser = await build({ entryPoints: ["src/browser.ts"], bundle: true, format: "iife", platform: "browser", target: "es2022", minify: true, write: false });
writeFileSync("build/studio-sdk.txt", browser.outputFiles[0].text);
