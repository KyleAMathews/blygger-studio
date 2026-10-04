// Merge models.json with an optional, gitignored models.local.json into
// build/models.json, which the Worker embeds (src/ai/models.ts). The local file
// is how an operator edits the model list without a merge conflict on the next
// `npm run upgrade`. Runs as the first step of `npm run build`.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

interface Provider { label: string; api: string; key_secret: string; prefixes?: string[] }
interface Model { id: string; provider: string; label: string; note?: string }
interface Manifest { providers: Record<string, Provider>; models: Model[] }
interface Local { providers?: Record<string, Partial<Provider>>; models?: Model[]; remove?: string[] }

const APIS = new Set(["anthropic-messages", "openai-responses", "gemini-generate"]);
const fail = (msg: string): never => {
  console.error(`build-models: ${msg}`);
  process.exit(1);
};
const read = <T>(path: string): T => {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch (e) {
    return fail(`${path} is not valid JSON: ${(e as Error).message}`);
  }
};

const base = read<Manifest>("models.json");
// A release bundles the shipped list only, never a maintainer's own overrides.
const local = !process.env.BLYG_MODELS_SHIPPED_ONLY && existsSync("models.local.json") ? read<Local>("models.local.json") : null;
const providers: Record<string, Provider> = { ...base.providers };
for (const [key, over] of Object.entries(local?.providers ?? {})) providers[key] = { ...providers[key], ...over } as Provider;
const byId = new Map(base.models.map((m) => [m.id, m]));
for (const m of local?.models ?? []) byId.set(m.id, { ...byId.get(m.id), ...m });
for (const id of local?.remove ?? []) byId.delete(id);
const models = [...byId.values()];

for (const [key, p] of Object.entries(providers)) {
  if (!p.label || !p.key_secret || !APIS.has(p.api)) fail(`provider "${key}" needs a label, a key_secret and an api of ${[...APIS].join(", ")}`);
}
for (const m of models) {
  if (!m.id || !m.label || !providers[m.provider]) fail(`model "${m.id}" needs a label and a known provider (got "${m.provider}")`);
}

mkdirSync("build", { recursive: true });
writeFileSync("build/models.json", JSON.stringify({ providers, models, local: !!local }, null, 2) + "\n");
console.log(`build-models: ${models.length} models from ${local ? "models.json + models.local.json" : "models.json"}`);
