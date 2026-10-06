import { z } from "@hono/zod-openapi";
import { ItemRowSchema, VersionRowSchema, MediaRowSchema, SubscriptionRowSchema, HopperRowSchema, ImportedItemRowSchema, MentionInRowSchema, HopperItemRowSchema } from "./schemas.ts";

export const CitationSchema = z.object({ source: z.string(), author: z.string().optional(), excerpt: z.string().optional(), url: z.string(), retrieved: z.string() }).openapi("Citation");
export const VersionReferenceSchema = z.object({ origin: z.string().url(), id: z.string().min(1), version: z.number().int().positive(), cited: CitationSchema.optional() }).strict().openapi("VersionReference");
export const StubSchema = z.union([VersionReferenceSchema, z.object({ url: z.string().url(), cited: CitationSchema.optional() }).strict()]).openapi("CitationTarget");
export const ProvenanceSchema = z.object({ sources: z.array(z.object({ id: z.string(), version: z.number().int().positive() })), model: z.string().optional(), at: z.string().optional() }).passthrough().openapi("GenerationProvenance");
export const TransclusionSchema = z.object({ id: z.string(), version: z.number().int().positive(), origin: z.string().optional(), cited: CitationSchema.optional(), selector: z.object({ exact: z.string(), prefix: z.string().optional(), suffix: z.string().optional() }).optional() }).openapi("Transclusion");
export const ItemSchema = z.object(ItemRowSchema.omit({ show_responses: true, responses_override: true, highlight_override: true, tk_provenance_json: true, stub_of: true, forked_from: true, fork_cite: true, dirty: true }).shape).extend({
  dirty: z.boolean(), responses: z.enum(["default", "show", "hide"]), highlight: z.enum(["default", "show", "hide"]),
  provenance: z.array(z.union([ProvenanceSchema, z.null()])),
  stub_of: z.union([StubSchema, z.null()]), forked_from: z.union([VersionReferenceSchema, z.null()]), fork_cite: z.union([CitationSchema, z.null()]),
}).openapi("Item");
export const VersionSchema = z.object(VersionRowSchema.omit({ pinned: true, transclusions: true, generated_json: true, stub_of: true, stub_cite: true, note_generated: true }).shape).extend({
  kind: z.enum(["fragment", "thread", "withdrawn"]), pinned: z.boolean(), note_generated: z.boolean(), transclusions: z.array(TransclusionSchema), generated: z.array(ProvenanceSchema),
  stub_of: z.union([StubSchema, z.null()]), stub_cite: z.union([CitationSchema, z.null()]),
}).openapi("Version");
export const MediaSchema = z.object(MediaRowSchema.omit({ r2_key: true }).shape).extend({ url: z.string() }).openapi("Media");
export const SubscriptionSchema = z.object(SubscriptionRowSchema.omit({ etag: true, last_modified: true, newest_guid: true, in_blogroll: true, flags: true, title_auto: true }).shape).extend({ title_follows_source: z.boolean(), in_blogroll: z.boolean(), flags: z.array(z.object({ type: z.string(), at: z.string(), detail: z.string().optional() })) }).openapi("Subscription");
export const HopperSchema = z.object(HopperRowSchema.shape).extend({ public: z.boolean(), slug_frozen: z.boolean() }).openapi("Hopper");
export const ImportedItemSchema = z.object(ImportedItemRowSchema.shape).extend({ l0: z.boolean() }).openapi("ImportedItem");
export const MentionSchema = z.object(MentionInRowSchema.shape).extend({ hidden: z.boolean() }).openapi("Mention");

// Read-resource schemas are shared by the API contract and Studio collections.
// Keep them here rather than importing route registration into the browser.
export const ItemListRowSchema = ItemSchema.extend({
  pins: z.array(z.object({
    version: z.number().int().positive(),
    kind: z.enum(["fragment", "thread"]),
  })).optional(),
});
export const ItemDetailSchema = z.object({
  ...ItemSchema.shape,
  authored_kind: z.enum(["fragment", "thread"]),
  media: z.array(MediaSchema),
  versions: z.array(VersionSchema),
  published: z.union([VersionSchema, z.null()]),
});
export const HopperDetailSchema = z.object({
  hopper: HopperSchema,
  memberships: z.array(HopperItemRowSchema),
  items: z.array(ImportedItemSchema),
  total: z.number().int().nonnegative(),
  source_count: z.number().int().nonnegative(),
});
const ownEntry = z.object({ id: z.string(), kind: z.enum(["fragment", "thread"]), withdrawn: z.boolean(), updated: z.string(), contentHtml: z.string() });
const importedEntry = z.object({ subscriptionId: z.string(), subscriptionTitle: z.string(), remoteId: z.string(), kind: z.enum(["fragment", "thread"]), withdrawn: z.boolean(), l0: z.boolean(), updated: z.string().nullable(), observedAt: z.string(), contentHtml: z.string(), pinnedVersionRetained: z.number().nullable(), sourceUrl: z.string().nullable() });
export const ReadingEntrySchema = z.object({ key: z.string(), source: z.enum(["own", "imported"]), kind: z.enum(["fragment", "thread"]), withdrawn: z.boolean(), l0: z.boolean(), contentHtml: z.string(), displayAt: z.string(), own: ownEntry.optional(), imported: importedEntry.optional() }).openapi("ReadingEntry");
export const ReadingPageSchema = z.object({
  items: z.array(ReadingEntrySchema),
  counts: z.object({
    all: z.number(),
    own: z.number(),
    subscriptions: z.record(z.string(), z.number()),
  }),
  total: z.number(),
  offset: z.number(),
  limit: z.number(),
  selected: z.string(),
});
export const MentionSourceSchema = z.object({
  holder: z.string().nullable(),
  subscription: z.union([SubscriptionSchema, z.null()]),
});
export const UpdateStateSchema = z.record(z.string(), z.string());
export const AuthorizationSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  name: z.string(),
  manual: z.boolean(),
  resource: z.string(),
  scope: z.array(z.string()),
  createdAt: z.number(),
  expiresAt: z.number().optional(),
}).openapi('Authorization');
