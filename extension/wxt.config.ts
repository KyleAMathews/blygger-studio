import { defineConfig } from 'wxt';
import { PUBLIC_KEY } from './lib/identity.ts';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Blygger Clipper',
    description: 'Quote what you read into a draft on your own blyg.',
    version: '0.1.0',
    key: PUBLIC_KEY,
    minimum_chrome_version: '116',
    permissions: ['contextMenus', 'sidePanel', 'activeTab', 'scripting', 'identity', 'storage', 'alarms'],
  },
  // The panel reuses ../src/ui and ../sdk; the dev server must be allowed to read them.
  vite: () => ({ server: { fs: { allow: ['..'] } } }),
});
