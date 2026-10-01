import { createClient } from "@hey-api/openapi-ts";
import { readFileSync, rmSync, writeFileSync } from "node:fs";

const generator = "@hey-api/openapi-ts";
const version = JSON.parse(readFileSync("node_modules/@hey-api/openapi-ts/package.json", "utf8")).version;
rmSync("sdk/generated", { recursive: true, force: true });
await createClient({ input: "openapi.json", output: { path: "sdk/generated", module: { extension: ".js" } }, plugins: ["@hey-api/typescript", "@hey-api/client-fetch", "@hey-api/sdk"] });
writeFileSync("sdk/generation.json", `${JSON.stringify({ generator, version, input: "openapi.json", importExtension: ".js", plugins: ["@hey-api/typescript", "@hey-api/client-fetch", "@hey-api/sdk"] }, null, 2)}\n`);
