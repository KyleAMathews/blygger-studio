import type { Item, Version, Media, Subscription, Hopper, ImportedItem, Mention } from "../sdk/dist/browser.js";
import type { ItemRow, VersionRow, MediaRow, SubscriptionRow, HopperRow, ImportedItemRow, MentionInRow } from "./types.ts";

// The retained server-rendered UI uses storage-shaped values internally. These
// conversions stay at its boundary; the API and SDK expose resource schemas.
const stored = (value: unknown) => value === null || value === undefined ? null : JSON.stringify(value);
export const studioItem = (item: Item): ItemRow => ({ ...item, dirty: Number(item.dirty), show_responses: 0, responses_override: item.responses === "default" ? null : Number(item.responses === "show"), tk_provenance_json: stored(item.provenance), stub_of: stored(item.stub_of), forked_from: stored(item.forked_from), fork_cite: stored(item.fork_cite) });
export const studioVersion = (version: Version): VersionRow => ({ ...version, pinned: Number(version.pinned), transclusions: version.kind === "thread" ? stored(version.transclusions) : null, generated_json: version.generated.length ? stored(version.generated) : null, stub_of: stored(version.stub_of), stub_cite: stored(version.stub_cite) });
export const studioMedia = (media: Media): MediaRow => ({ ...media, r2_key: media.url });
export const studioSubscription = (sub: Subscription): SubscriptionRow => ({ ...sub, in_blogroll: Number(sub.in_blogroll), flags: JSON.stringify(sub.flags), etag: null, last_modified: null, newest_guid: null });
export const studioHopper = (hopper: Hopper): HopperRow => ({ ...hopper, public: Number(hopper.public), slug_frozen: Number(hopper.slug_frozen) });
export const studioImported = (item: ImportedItem): ImportedItemRow => ({ ...item, l0: Number(item.l0) });
export const studioMention = (mention: Mention): MentionInRow => ({ ...mention, hidden: Number(mention.hidden) });
