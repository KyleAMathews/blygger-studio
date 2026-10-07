import { z } from 'zod';
import {
  zListItemsResponse,
  zGetItemResponse,
  zHopper,
  zGetHopperResponse,
  zImportedItem,
  zReadingEntry,
  zListReadingResponse,
  zSubscription,
  zMention,
  zGetMentionSourceResponse,
  zGetUpdateStateResponse,
  zAuthorization,
  zSettings,
  zSignalRow,
  zHopperItemRow,
  zMentionOutRow,
} from '../../sdk/dist/schemas.js';

const rank = z.number().int().nonnegative();
export const sourceSchemas = {
  items: zListItemsResponse.shape.items.element,
  itemHistory: zGetItemResponse.pick({
    id: true,
    authored_kind: true,
    media: true,
    versions: true,
    published: true,
  }),
  settings: zSettings.extend({ key: z.literal('settings') }),
  subscriptions: zSubscription,
  hoppers: zHopper,
  hopperStats: zGetHopperResponse.pick({ total: true, source_count: true })
    .extend({ id: zHopper.shape.id }),
  hopperEntries: z.object({ hopper_id: zHopper.shape.id, rank, item: zImportedItem }),
  hopperMemberships: zHopperItemRow.extend({ rank }),
  reading: zReadingEntry.extend({ view: z.string(), rank }),
  signals: zSignalRow,
  updates: zGetUpdateStateResponse.and(z.object({ key: z.literal('updates') })),
  authorizations: zAuthorization,
  inbound: zMention,
  outbound: zMentionOutRow,
  mentionSources: zGetMentionSourceResponse.extend({ key: z.string() }),
};
export const readingResponseSchema = zListReadingResponse.extend({ view: z.string() });
