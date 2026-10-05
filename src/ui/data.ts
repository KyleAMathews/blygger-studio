// The Studio's own data: the cookie client against this origin, polling while
// the tab is visible. Other hosts build theirs with createStudioData.
import { createBlyggerClient } from '../../sdk/dist/browser.js';
import { createStudioData } from './data-core.ts';
export { LENSES, lensKind, readingKey } from './data-core.ts';
export type { Detail, Lens, Reading, StudioData } from './data-core.ts';

const studio = createStudioData(createBlyggerClient({ baseUrl: location.origin }));
studio.polling.start(window, document);
export const {
  client,
  queryClient,
  polling,
  items,
  settings,
  subscriptions,
  hoppers,
  signals,
  itemDetail,
  reading,
  readingView,
  refreshReading,
  hopperDetail,
  changed,
  updates,
  hopperPreview,
  authorizations,
} = studio;
