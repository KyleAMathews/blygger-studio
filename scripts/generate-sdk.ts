import { createClient, defineConfig } from "@hey-api/openapi-ts";
import { readFileSync, rmSync, writeFileSync } from "node:fs";

const generator = "@hey-api/openapi-ts";
const version = JSON.parse(readFileSync("node_modules/@hey-api/openapi-ts/package.json", "utf8")).version;
const sdkPlugins = ["@hey-api/typescript", "@hey-api/client-fetch", "@hey-api/sdk"] as const;
const plugins = [...sdkPlugins, "zod"] as const;
const config = await defineConfig({
  input: "openapi.json",
  output: { path: "sdk/generated", module: { extension: ".js" } },
  plugins: [
    ...sdkPlugins,
    {
      name: "zod",
      "~resolvers": {
        object(ctx) {
          // The default generator omits additionalProperties for objects with
          // named fields. Preserve the spec's explicit open/closed object rules.
          const base = ctx.nodes.base(ctx);
          const additional = ctx.schema.additionalProperties;
          if (additional === false || (additional && additional.type === "never"))
            return base.attr("strict").call();
          const hasNamedProperties = Object.keys(ctx.schema.properties ?? {}).length > 0;
          if (!hasNamedProperties) return base;
          const additionalSchema = ctx.nodes.additionalProperties({
            ...ctx,
            schema: { ...ctx.schema, properties: {} },
          });
          return additionalSchema ? base.attr("catchall").call(additionalSchema) : base;
        },
      },
    },
  ],
});
rmSync("sdk/generated", { recursive: true, force: true });
await createClient(config);
writeFileSync("sdk/generation.json", `${JSON.stringify({ generator, version, input: "openapi.json", importExtension: ".js", plugins, zodAdditionalProperties: "preserve" }, null, 2)}\n`);

// Generate the conditional-read inventory from the same GET contracts as the SDK.
const document = JSON.parse(readFileSync("openapi.json", "utf8"));
const reads = Object.entries(document.paths).sort(([a], [b]) => (a.match(/\{/g)?.length ?? 0) - (b.match(/\{/g)?.length ?? 0)).flatMap(([path, methods]) => {
  const get = (methods as { get?: { operationId: string; responses: Record<string, unknown> } }).get;
  if (!get?.responses['304']) return [];
  const name = `z${get.operationId[0].toUpperCase()}${get.operationId.slice(1)}Response`;
  const pattern = '^' + path.split(/(\{\w+\})/).map(part => /^\{\w+\}$/.test(part) ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('') + '$';
  return [{ name, pattern }];
});
writeFileSync('sdk/generated/read-validators.gen.ts', `// Generated from OpenAPI. Do not edit.\nimport { ${reads.map(read => read.name).join(', ')} } from './zod.gen.js';\nexport const readValidators = [\n${reads.map(read => `  { pattern: new RegExp(${JSON.stringify(read.pattern)}), schema: ${read.name} },`).join('\n')}\n];\n`);
