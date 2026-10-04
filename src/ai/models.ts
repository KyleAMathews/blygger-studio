// The model manifest (models.json, merged with an operator's models.local.json
// by scripts/build-models.ts) and the rules for turning a model id into a
// provider call. Which model each AI function uses is a setting; which secret
// holds each provider's key is the manifest's.
import manifest from "../../build/models.json";

export type ProviderApi = "anthropic-messages" | "openai-responses" | "gemini-generate";
export interface ProviderSpec {
  label: string;
  api: ProviderApi;
  key_secret: string;
  prefixes?: string[];
}
export interface ModelSpec {
  id: string;
  provider: string;
  label: string;
  note?: string;
}
export interface Manifest {
  providers: Record<string, ProviderSpec>;
  models: ModelSpec[];
  /** True when models.local.json contributed to this build. */
  local: boolean;
}

export const MODELS = manifest as Manifest;

/** The AI functions that take a model. Authoring is reserved; nothing calls it yet. */
export const AI_PURPOSES = ["tk", "changelog", "feed"] as const;
export type AiPurpose = (typeof AI_PURPOSES)[number];

/** A model's provider: its manifest entry, else the provider whose prefix the id starts with. */
export function providerFor(modelId: string, m: Manifest = MODELS): { key: string; spec: ProviderSpec } | null {
  const listed = m.models.find((x) => x.id === modelId);
  if (listed && m.providers[listed.provider]) return { key: listed.provider, spec: m.providers[listed.provider] };
  for (const [key, spec] of Object.entries(m.providers)) {
    if ((spec.prefixes ?? []).some((p) => modelId.startsWith(p))) return { key, spec };
  }
  return null;
}

/** Which providers have a key configured, by name only; values are never read out. */
export function configuredProviders(env: object, m: Manifest = MODELS): Record<string, boolean> {
  const vars = env as Record<string, unknown>;
  return Object.fromEntries(Object.entries(m.providers).map(([key, spec]) => [key, typeof vars[spec.key_secret] === "string" && !!vars[spec.key_secret]]));
}
