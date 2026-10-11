import { paceLayered } from "./pace-layered.ts";
import { reverseChronological } from "./reverse-chronological.ts";
import type { FeedAlgorithm } from "./types.ts";

export type { FeedAlgorithm, FeedHistory, FeedHistoryItem, FeedVersion } from "./types.ts";

/**
 * The home page orders this node can use, keyed by the `feed_order` setting.
 * Both are core: newest-first is the synchronic view, pace-layered the
 * diachronic one and the default for a fresh install (session 46). Further
 * orders over the same history arrive as extensions.
 */
export const FEED_ALGORITHMS: readonly FeedAlgorithm[] = [paceLayered, reverseChronological];

export const DEFAULT_FEED_ORDER = paceLayered.id;
