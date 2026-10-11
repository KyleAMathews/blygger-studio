// An example home page order, to copy (docs/extensions.md, "Feed orders").
// It reads the same public history as the core orders (src/feeds/types.ts):
// versions, times, notes, pins and own-origin quotes, nothing private.
import type { FeedAlgorithm } from "../../src/feeds/types.ts";

/** Pinned items first, most pins first; then everything else, newest first. */
export const pinsFirst: FeedAlgorithm = {
  id: "feed-example/pins-first",
  title: "Pinned first",
  description: "Items with pinned versions at the top, most pins first, then the rest newest first.",
  order(history) {
    const pins = (item: (typeof history.items)[number]) => item.versions.filter((v) => v.pinned).length;
    const latest = (item: (typeof history.items)[number]) => item.versions[item.versions.length - 1]?.at ?? "";
    return history.items
      .filter((item) => !item.withdrawn && item.versions.length)
      .sort((a, b) => pins(b) - pins(a) || latest(b).localeCompare(latest(a)))
      .map((item) => item.id);
  },
};
