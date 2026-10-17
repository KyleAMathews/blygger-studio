import type { FeedAlgorithm } from "./types.ts";

/** The synchronic view: the most recently published version first. */
export const reverseChronological: FeedAlgorithm = {
  id: "reverse-chronological",
  title: "Newest first",
  description: "Items in the order they were last published, most recent at the top.",
  order(history) {
    const latest = (item: (typeof history.items)[number]) => item.versions[item.versions.length - 1]?.at ?? "";
    return history.items
      .filter((item) => !item.withdrawn && item.versions.length)
      .sort((a, b) => latest(b).localeCompare(latest(a)) || b.id.localeCompare(a.id))
      .map((item) => item.id);
  },
};
