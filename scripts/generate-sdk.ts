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
