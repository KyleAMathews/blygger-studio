// The home page orders a node can use: the core ones plus those registered by
// extensions it has compiled in and enabled (docs/extensions.md, "Feed
// orders"). Server-side only: it reads the compiled extension list, which the
// browser bundle must not import.
import { compiledServerExtensions } from "../../build/extensions.server.ts";
import type { ServerExtension } from "../extensions/server.ts";
import { DEFAULT_FEED_ORDER, FEED_ALGORITHMS } from "./index.ts";
import type { FeedAlgorithm } from "./types.ts";

export function availableFeedAlgorithms(enabled: readonly string[], extensions: readonly ServerExtension[] = compiledServerExtensions): FeedAlgorithm[] {
  const fromExtensions = extensions
    .filter((extension) => enabled.includes(extension.name))
    // An extension's orders are namespaced by its name, so none can shadow a
    // core order or another extension's.
    .flatMap((extension) => (extension.feeds ?? []).filter((algorithm) => algorithm.id.startsWith(`${extension.name}/`)));
  return [...FEED_ALGORITHMS, ...fromExtensions];
}

/** The order a setting names, or the default when it names one this node cannot run (a disabled extension's, say). */
export function resolveFeedAlgorithm(id: string, available: readonly FeedAlgorithm[]): FeedAlgorithm {
  return available.find((algorithm) => algorithm.id === id) ?? available.find((algorithm) => algorithm.id === DEFAULT_FEED_ORDER)!;
}

/** What Settings shows: id, title and description of each order this node can use. */
export const feedOrderChoices = (enabled: readonly string[]) =>
  availableFeedAlgorithms(enabled).map(({ id, title, description }) => ({ id, title, description }));
