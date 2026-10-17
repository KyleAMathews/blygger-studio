/*
 * feed-example: adds a "Pinned first" home page order. Its work is on the
 * server (server.ts, feeds.ts); the UI half only names it in Settings.
 */
import type { StudioExtension } from '../../../src/ui/extension-api.ts';

export const extension: StudioExtension = {
  name: 'feed-example',
  label: 'Pinned-first home page',
  description: 'Adds a home page order with pinned items at the top. Choose it under Settings → home page once enabled.',
};
