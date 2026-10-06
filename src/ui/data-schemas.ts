import { z } from 'zod';
import {
  ItemListRowSchema, ItemDetailSchema, HopperSchema, HopperDetailSchema,
  ImportedItemSchema, ReadingEntrySchema, ReadingPageSchema, SubscriptionSchema,
  MentionSchema, MentionSourceSchema, UpdateStateSchema, AuthorizationSchema,
} from '../contract/resource-schemas.ts';
import { SettingsSchema, SignalRowSchema, HopperItemRowSchema, MentionOutRowSchema } from '../contract/schemas.ts';

const rank = z.number().int().nonnegative();
export const sourceSchemas = {
  items: ItemListRowSchema,
  itemHistory: ItemDetailSchema.pick({
    id: true,
    authored_kind: true,
    media: true,
    versions: true,
    published: true,
  }),
  settings: SettingsSchema.extend({ key: z.literal('settings') }),
  subscriptions: SubscriptionSchema,
  hoppers: HopperSchema,
  hopperStats: HopperDetailSchema.pick({ total: true, source_count: true })
    .extend({ id: HopperSchema.shape.id }),
  hopperEntries: z.object({ hopper_id: HopperSchema.shape.id, rank, item: ImportedItemSchema }),
  hopperMemberships: HopperItemRowSchema.extend({ rank }),
  reading: ReadingEntrySchema.extend({ view: z.string(), rank }),
  signals: SignalRowSchema,
  updates: UpdateStateSchema.and(z.object({ key: z.literal('updates') })),
  authorizations: AuthorizationSchema,
  inbound: MentionSchema,
  outbound: MentionOutRowSchema,
  mentionSources: MentionSourceSchema.extend({ key: z.string() }),
};
export const readingResponseSchema = ReadingPageSchema.extend({ view: z.string() });
