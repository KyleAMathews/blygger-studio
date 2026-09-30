import { optionalJsonBody } from "./app.ts";
import { createRoute, z, type RouteConfig } from "@hono/zod-openapi";
import { ItemRowSchema, VersionRowSchema, MediaRowSchema, SettingsSchema, SubscriptionRowSchema, HopperRowSchema, HopperItemRowSchema, ImportedItemRowSchema, SignalRowSchema, MentionInRowSchema, MentionOutRowSchema } from "./schemas.ts";

const json = (schema: z.ZodType) => ({ "application/json": { schema } });
export const ErrorSchema = z.object({ error: z.string(), errors: z.array(z.unknown()).optional(), tried: z.array(z.string()).optional() }).passthrough().openapi("ApiError");
const ok = z.object({ ok: z.boolean() });
const created = z.object({ id: z.string(), kind: z.enum(["fragment", "thread"]), status: z.literal("draft") });
const ref = z.object({ origin: z.string(), id: z.string(), version: z.number().int().positive() });
const stub = z.union([ref, z.object({ url: z.string() })]);
const itemBody = z.object({ content_md: z.string().optional(), kind: z.string().optional(), stub_of: stub.nullable().optional() });
const toggle = z.union([z.boolean(), z.enum(["on", "off"])]);
const settingsBody = SettingsSchema.partial().extend({ accept_mentions: toggle.optional(), update_check: toggle.optional(), show_responses_default: toggle.optional(), update_notice_ack: toggle.optional() });
const note = z.object({ note: z.string().optional() });
const version = z.object({ version: z.number().int().positive() });
const page = z.object({ offset: z.coerce.number().int().min(0).optional(), limit: z.coerce.number().int().min(1).max(100).optional() });
const issue = z.object({ id: z.string().optional(), directive: z.string().optional(), reason: z.string().optional() }).passthrough();
const scopes = z.array(z.object({ index: z.number(), instruction: z.string(), output: z.string().nullable(), hasOutput: z.boolean(), block: z.boolean() }));
const preview = z.object({ html: z.string(), scopes, link_errors: z.array(issue).optional(), errors: z.array(issue).optional(), transclusions: z.array(z.unknown()).optional() });
const ownEntry = z.object({ id: z.string(), kind: z.enum(["fragment", "thread"]), withdrawn: z.boolean(), updated: z.string(), contentHtml: z.string() });
const importedEntry = z.object({ subscriptionId: z.string(), subscriptionTitle: z.string(), remoteId: z.string(), kind: z.enum(["fragment", "thread"]), withdrawn: z.boolean(), l0: z.boolean(), updated: z.string().nullable(), observedAt: z.string(), contentHtml: z.string(), pinnedVersionRetained: z.number().nullable(), sourceUrl: z.string().nullable() });
export const ReadingEntrySchema = z.object({ key: z.string(), source: z.enum(["own", "imported"]), kind: z.enum(["fragment", "thread"]), withdrawn: z.boolean(), l0: z.boolean(), contentHtml: z.string(), displayAt: z.string(), own: ownEntry.optional(), imported: importedEntry.optional() }).openapi("ReadingEntry");
const subscribed = z.object({ id: z.string(), kind: z.enum(["blyg", "rss"]), origin: z.string() });
const confirmation = z.object({ needsConfirm: z.literal(true), kind: z.enum(["blyg", "rss"]), origin: z.string().optional(), feedUrl: z.string().optional(), title: z.string(), siteMismatch: z.object({ asserted: z.string(), actual: z.string() }).optional() });
const counts = z.object({ all: z.number(), own: z.number(), subscriptions: z.record(z.string(), z.number()) });

function route<P extends string>(id: string, method: RouteConfig["method"], path: P, response: z.ZodType, body?: z.ZodType, status = 200, query?: z.ZodObject, optionalBody = false): RouteConfig & { path: P } {
  const params = Object.fromEntries([...path.matchAll(/\{(\w+)\}/g)].map((m) => [m[1], z.string()]));
  return createRoute({
    operationId: id, method, path, ...(optionalBody ? { middleware: optionalJsonBody } : {}), tags: ["studio"], security: [{ ownerSession: [] }],
    request: { ...(Object.keys(params).length ? { params: z.object(params) } : {}), ...(query ? { query } : {}), ...(body ? { body: { required: !optionalBody, content: json(body) } } : {}) },
    responses: { [status]: { description: "Success", content: json(response) }, ...Object.fromEntries([400, 401, 404, 409, 413, 415, 422, 500, 502].map((s) => [s, { description: "Request failed", content: json(ErrorSchema) }])) },
  });
}

export const routes = {
  createItem: route("createItem", "post", "/items", created, itemBody, 201, undefined, true),
  forkItem: route("forkItem", "post", "/fork", created, ref, 201),
  updateItem: route("updateItem", "put", "/items/{id}", ok.extend({ kind: z.string().optional() }), itemBody),
  publishItem: route("publishItem", "post", "/items/{id}/publish", ok.extend({ version: z.number(), warning: z.string().optional() }), note, 200, undefined, true),
  generateItem: route("generateItem", "post", "/items/{id}/generate", z.object({ text: z.string(), model: z.string() }), z.object({ scope: z.number().int().min(0) })),
  withdrawItem: route("withdrawItem", "post", "/items/{id}/withdraw", ok.extend({ version: z.number() }), note, 200, undefined, true),
  pinItem: route("pinItem", "post", "/items/{id}/pin", ok.extend({ version: z.number(), already: z.boolean() }), version),
  restoreItem: route("restoreItem", "post", "/items/{id}/restore", ok.extend({ restored: z.number(), publishesAs: z.number() }), version),
  deleteItem: route("deleteItem", "delete", "/items/{id}", ok.extend({ outcome: z.literal("discarded") })),
  uploadMedia: createRoute({ ...route("uploadMedia", "post", "/media", z.object({ id: z.string(), url: z.string(), mime: z.string() }), undefined, 201), request: { body: { required: true, content: { "multipart/form-data": { schema: z.object({ file: z.custom<File>((value) => value instanceof File, "file field required (multipart)").openapi({ type: "string", format: "binary" }), item_id: z.string().optional(), alt: z.string().optional() }) } } } } }),
  updateSettings: route("updateSettings", "put", "/settings", ok, settingsBody),
  createSubscription: route("createSubscription", "post", "/subscriptions", z.union([confirmation, subscribed]), z.object({ url: z.string(), confirm: z.boolean().optional(), title: z.string().optional() })),
  updateSubscription: route("updateSubscription", "put", "/subscriptions/{id}", ok, z.object({ in_blogroll: z.boolean().optional(), title: z.string().optional() })),
  pauseSubscription: route("pauseSubscription", "post", "/subscriptions/{id}/pause", ok),
  resumeSubscription: route("resumeSubscription", "post", "/subscriptions/{id}/resume", ok),
  resyncSubscription: route("resyncSubscription", "post", "/subscriptions/{id}/resync", ok.extend({ changed: z.number() })),
  deleteSubscription: route("deleteSubscription", "delete", "/subscriptions/{id}", ok),
  createHopper: route("createHopper", "post", "/hoppers", z.object({ id: z.string(), name: z.string(), slug: z.string().nullable() }), z.object({ name: z.string() }), 201),
  updateHopper: route("updateHopper", "put", "/hoppers/{id}", ok.extend({ slug: z.string().nullable(), slug_frozen: z.boolean() }), z.object({ name: z.string().optional(), public: z.boolean().optional() })),
  deleteHopper: route("deleteHopper", "delete", "/hoppers/{id}", ok),
  addHopperItem: route("addHopperItem", "put", "/hoppers/{id}/items/{sub}/{remoteId}", ok),
  removeHopperItem: route("removeHopperItem", "delete", "/hoppers/{id}/items/{sub}/{remoteId}", ok),
  setSignal: route("setSignal", "put", "/signals/{sub}/{remoteId}", ok, z.object({ thumb: z.union([z.literal(1), z.literal(-1)]) })),
  deleteSignal: route("deleteSignal", "delete", "/signals/{sub}/{remoteId}", ok),
  createStub: route("createStub", "post", "/stubs", z.object({ id: z.string() }), z.object({ subscription_id: z.string(), remote_id: z.string(), selection: z.string().optional() }), 201),
  setResponses: route("setResponses", "put", "/items/{id}/responses", ok.extend({ override: z.number().nullable(), showing: z.boolean() }), z.object({ mode: z.enum(["default", "show", "hide"]).optional(), show: z.boolean().optional() })),
  setMentionHidden: route("setMentionHidden", "put", "/mentions/{id}/hidden", ok.extend({ hidden: z.boolean() }), z.object({ hidden: z.boolean() })),
  listItems: route("listItems", "get", "/items", z.object({ items: z.array(ItemRowSchema), total: z.number(), offset: z.number(), limit: z.number() }), undefined, 200, page),
  getItem: route("getItem", "get", "/items/{id}", z.object({ item: ItemRowSchema, kind: z.enum(["fragment", "thread"]), media: z.array(MediaRowSchema), versions: z.array(VersionRowSchema), published: VersionRowSchema.nullable() })),
  getSettings: route("getSettings", "get", "/settings", SettingsSchema),
  listSubscriptions: route("listSubscriptions", "get", "/subscriptions", z.array(SubscriptionRowSchema)),
  listHoppers: route("listHoppers", "get", "/hoppers", z.array(HopperRowSchema)),
  getHopper: route("getHopper", "get", "/hoppers/{id}", z.object({ hopper: HopperRowSchema, memberships: z.array(HopperItemRowSchema), items: z.array(ImportedItemRowSchema) })),
  listSignals: route("listSignals", "get", "/signals", z.array(SignalRowSchema)),
  listMentions: route("listMentions", "get", "/mentions", z.object({ inbound: z.array(MentionInRowSchema), outbound: z.array(MentionOutRowSchema) })),
  preview: route("preview", "post", "/preview", preview, z.object({ content_md: z.string().optional(), item_id: z.string().optional(), kind: z.enum(["fragment", "thread"]).optional() })),
  search: route("search", "get", "/search", z.object({ results: z.array(z.object({ id: z.string(), excerpt: z.string(), version: z.number(), updated: z.string(), badge: z.string() })), total: z.number(), offset: z.number(), limit: z.number() }), undefined, 200, z.object({ offset: page.shape.offset, q: z.string().optional() })),
  getVersion: route("getVersion", "get", "/items/{id}/versions/{v}", z.object({ version: z.number(), published_at: z.string(), note: z.string().nullable(), pinned: z.boolean(), content_html: z.string() })),
  listReading: route("listReading", "get", "/reading", z.object({ entries: z.array(ReadingEntrySchema), counts, total: z.number(), page: z.number(), pages: z.number(), limit: z.number(), selected: z.string() }), undefined, 200, z.object({ page: z.coerce.number().int().min(1).optional(), sub: z.string().optional() })),
  getImportedItem: route("getImportedItem", "get", "/imports/{sub}/{id}", ImportedItemRowSchema),
  getUpdateState: route("getUpdateState", "get", "/update-state", z.record(z.string(), z.string())),
  getMentionSource: route("getMentionSource", "get", "/mentions/{id}/source", z.object({ holder: z.string().nullable(), subscription: SubscriptionRowSchema.nullable() })),
  getForkOptions: route("getForkOptions", "get", "/fork-options", z.object({ origin: z.string(), ourOrigin: z.string(), versions: z.array(z.object({ version: z.number(), at: z.string(), note: z.string().nullable() })), error: z.string().optional() }), undefined, 200, z.object({ id: z.string(), sub: z.string().optional(), origin: z.string().optional() })),
};
// The resolve/confirm operation has two successful response shapes and statuses.
routes.createSubscription.responses[201] = { description: "Subscribed", content: json(subscribed) };
